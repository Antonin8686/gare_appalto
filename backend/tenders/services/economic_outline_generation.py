"""Generazione outline e voci dell'offerta economica per gara."""

from __future__ import annotations

import uuid
from decimal import Decimal, InvalidOperation
from typing import TypedDict

from django.utils import timezone

from companies.models import Company

from ..models import Document, EconomicRelation, Requirement, Tender, default_economic_relation_outline
from .economic_offer_extraction import ExtractedEconomicStructure, parse_economic_structure_from_text


class GeneratedEconomicLineItem(TypedDict):
    id: str
    voce: str
    descrizione: str
    unita_misura: str
    quantita: str
    prezzo_unitario: str
    importo: str
    ribasso_percentuale: str
    notes: str
    order: int
    completed: bool
    source: str


class GeneratedEconomicOutline(TypedDict):
    pricing_model: str
    importo_base: str
    ribasso_massimo: str
    iva_percentuale: str
    formal_constraints: dict
    source_summary: str
    totals: dict


def _new_id() -> str:
    return uuid.uuid4().hex


def _parse_decimal(value: str) -> Decimal | None:
    if not value or not str(value).strip():
        return None
    cleaned = str(value).strip().replace(" ", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _compute_line_importo(quantita: str, prezzo_unitario: str) -> str:
    q = _parse_decimal(quantita)
    p = _parse_decimal(prezzo_unitario)
    if q is None or p is None:
        return ""
    return f"{(q * p).quantize(Decimal('0.01'))}"


def _compute_totals(
    line_items: list[GeneratedEconomicLineItem],
    *,
    importo_base: str,
    ribasso_percentuale: str = "",
) -> dict:
    imponibile = Decimal("0")
    for item in line_items:
        amount = _parse_decimal(item.get("importo", ""))
        if amount is not None:
            imponibile += amount

    if imponibile == 0 and importo_base:
        base = _parse_decimal(importo_base)
        if base is not None:
            imponibile = base

    ribasso = _parse_decimal(ribasso_percentuale) or Decimal("0")
    importo_post = imponibile
    if ribasso > 0:
        importo_post = imponibile * (Decimal("1") - ribasso / Decimal("100"))

    iva_rate = Decimal("0.22")
    iva = importo_post * iva_rate
    totale = importo_post + iva

    return {
        "imponibile": f"{imponibile.quantize(Decimal('0.01'))}",
        "ribasso_percentuale": str(ribasso) if ribasso else "",
        "importo_post_ribasso": f"{importo_post.quantize(Decimal('0.01'))}",
        "iva": f"{iva.quantize(Decimal('0.01'))}",
        "totale": f"{totale.quantize(Decimal('0.01'))}",
    }


def _line_items_from_structure(structure: ExtractedEconomicStructure) -> list[GeneratedEconomicLineItem]:
    items: list[GeneratedEconomicLineItem] = []
    for index, raw in enumerate(structure["line_items"], start=1):
        importo = _compute_line_importo(raw["quantita"], raw["prezzo_unitario"])
        items.append(
            {
                "id": _new_id(),
                "voce": raw["voce"],
                "descrizione": raw.get("descrizione", ""),
                "unita_misura": raw.get("unita_misura", "a corpo"),
                "quantita": raw.get("quantita", "1"),
                "prezzo_unitario": raw.get("prezzo_unitario", ""),
                "importo": importo,
                "ribasso_percentuale": "",
                "notes": "",
                "order": index,
                "completed": bool(importo),
                "source": raw.get("source", "documento"),
            }
        )
    return items


def _line_items_from_economic_requirements(tender: Tender) -> list[GeneratedEconomicLineItem]:
    items: list[GeneratedEconomicLineItem] = []
    requirements = Requirement.objects.filter(
        tender=tender,
        tipo=Requirement.Tipo.ECONOMICO,
    ).order_by("id")[:10]
    for index, req in enumerate(requirements, start=1):
        items.append(
            {
                "id": _new_id(),
                "voce": req.descrizione[:255],
                "descrizione": req.soglia_minima or req.soglia,
                "unita_misura": "a corpo",
                "quantita": "1",
                "prezzo_unitario": "",
                "importo": "",
                "ribasso_percentuale": "",
                "notes": "Derivato da requisito economico estratto",
                "order": index,
                "completed": False,
                "source": "requisito",
            }
        )
    return items


def _formal_constraints_from_tender(tender: Tender) -> dict:
    formal_rules = tender.formal_rules or {}
    allegati = formal_rules.get("allegati", [])
    if not isinstance(allegati, list):
        return {}
    economic = [
        item for item in allegati
        if isinstance(item, dict)
        and "economic" in str(item.get("label", "")).lower()
    ]
    return {"allegati_economici": economic}


def generate_economic_relation_outline(
    tender: Tender,
    company: Company | None = None,
) -> tuple[GeneratedEconomicOutline, list[GeneratedEconomicLineItem]]:
    documents = Document.objects.filter(
        tender=tender,
        status=Document.Status.DONE,
    ).order_by("-uploaded_at")

    combined_text = "\n\n".join(doc.text_content for doc in documents if doc.text_content)
    importo_fallback = str(tender.importo) if tender.importo else ""
    structure = parse_economic_structure_from_text(
        combined_text,
        importo_fallback=importo_fallback,
    )

    line_items = _line_items_from_structure(structure)
    if not line_items:
        req_items = _line_items_from_economic_requirements(tender)
        if req_items:
            line_items = req_items
            structure["source_summary"] += "; requisiti economici"

    if not line_items:
        line_items = [
            {
                "id": _new_id(),
                "voce": tender.oggetto[:255] if tender.oggetto else "Servizio in oggetto",
                "descrizione": "Voce generata automaticamente dall'oggetto gara",
                "unita_misura": "a corpo",
                "quantita": "1",
                "prezzo_unitario": importo_fallback,
                "importo": importo_fallback,
                "ribasso_percentuale": "",
                "notes": "",
                "order": 1,
                "completed": bool(importo_fallback),
                "source": "default",
            }
        ]
        structure["source_summary"] += "; template oggetto gara"

    if company:
        structure["source_summary"] += f"; personalizzato per {company.name}"

    outline: GeneratedEconomicOutline = {
        "pricing_model": structure["pricing_model"],
        "importo_base": structure["importo_base"] or importo_fallback,
        "ribasso_massimo": structure["ribasso_massimo"],
        "iva_percentuale": structure["iva_percentuale"],
        "formal_constraints": _formal_constraints_from_tender(tender),
        "source_summary": structure["source_summary"],
        "totals": _compute_totals(line_items, importo_base=structure["importo_base"] or importo_fallback),
    }
    return outline, line_items


def apply_outline_to_economic_relation(
    relation: EconomicRelation,
    outline: GeneratedEconomicOutline,
    line_items: list[GeneratedEconomicLineItem],
    *,
    preserve_line_items: bool = True,
) -> EconomicRelation:
    if preserve_line_items and relation.line_items:
        existing_by_voce = {
            str(item.get("voce", "")).strip().lower(): item
            for item in relation.line_items
            if item.get("voce")
        }
        merged: list[GeneratedEconomicLineItem] = []
        for item in line_items:
            key = item["voce"].strip().lower()
            existing = existing_by_voce.get(key)
            if existing and (existing.get("prezzo_unitario") or existing.get("importo")):
                merged.append({**item, **existing, "voce": item["voce"], "order": item["order"]})
            else:
                merged.append(item)
        line_items = merged

    outline["totals"] = _compute_totals(
        line_items,
        importo_base=outline.get("importo_base", ""),
    )
    relation.outline = outline
    relation.line_items = line_items
    relation.generated_at = timezone.now()
    relation.save(update_fields=["outline", "line_items", "generated_at", "updated_at"])
    return relation


def get_or_create_economic_relation(tender: Tender) -> EconomicRelation:
    relation, _ = EconomicRelation.objects.get_or_create(
        tender=tender,
        defaults={"outline": default_economic_relation_outline()},
    )
    return relation
