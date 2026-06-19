"""Estrazione struttura offerta economica da disciplinari e capitolati."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import TypedDict

PRICING_RIBASSO_PATTERN = re.compile(
    r"offerta\s+economicamente\s+pi[uù]\s+vantaggiosa|ribasso\s+unificato|"
    r"ribasso\s+percentuale|massimo\s+ribasso",
    re.IGNORECASE,
)
PRICING_UNITARI_PATTERN = re.compile(
    r"prezzi\s+unitari|elenco\s+prezzi|computo\s+metrico|listino\s+prezzi",
    re.IGNORECASE,
)
IMPORTO_BASE_PATTERN = re.compile(
    r"(?:importo\s+(?:a\s+)?base|valore\s+(?:a\s+)?base|importo\s+complessivo)"
    r"\s*(?:della\s+gara|dell['']appalto)?\s*[:\s]*€?\s*([\d][\d.\s]*(?:,\d{1,2})?)",
    re.IGNORECASE,
)
RIBASSO_MAX_PATTERN = re.compile(
    r"ribasso\s+(?:massimo|non\s+superiore)\s*(?:del|di)?\s*(\d+(?:[.,]\d+)?)\s*%",
    re.IGNORECASE,
)
LINE_ITEM_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:\d+[\.)]\s*)?([A-ZÀ-Ú][^\n]{8,120}?)\s+"
    r"(\d+(?:[.,]\d+)?)\s+([€a-zA-Z/%]+)\s+(\d+(?:[.,]\d+)?)?",
    re.MULTILINE,
)
VOCE_BULLET_PATTERN = re.compile(
    r"(?:^|\n)\s*[-•]\s*((?:servizi?|pulizia|custodia|manutenzione|fornitura|"
    r"canone|oneri)[^\n]{8,120})",
    re.IGNORECASE,
)
ONERI_SICUREZZA_PATTERN = re.compile(
    r"oneri\s+(?:della\s+)?sicurezza|costi\s+(?:della\s+)?sicurezza",
    re.IGNORECASE,
)


class ExtractedEconomicLineItem(TypedDict):
    voce: str
    descrizione: str
    unita_misura: str
    quantita: str
    prezzo_unitario: str
    source: str


class ExtractedEconomicStructure(TypedDict):
    pricing_model: str
    importo_base: str
    ribasso_massimo: str
    iva_percentuale: str
    line_items: list[ExtractedEconomicLineItem]
    source_summary: str


def _parse_amount(raw: str) -> str:
    cleaned = raw.strip().replace(" ", "")
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    else:
        cleaned = cleaned.replace(".", "")
    try:
        value = Decimal(cleaned)
    except InvalidOperation:
        return ""
    return f"{value.quantize(Decimal('0.01'))}"


def _detect_pricing_model(text: str) -> str:
    if PRICING_UNITARI_PATTERN.search(text):
        return "prezzi_unitari"
    if PRICING_RIBASSO_PATTERN.search(text):
        return "ribasso_percentuale"
    return "a_corpo"


def _extract_importo_base(text: str, fallback: str = "") -> str:
    match = IMPORTO_BASE_PATTERN.search(text)
    if match:
        parsed = _parse_amount(match.group(1))
        if parsed:
            return parsed
    return fallback


def _extract_ribasso_massimo(text: str) -> str:
    match = RIBASSO_MAX_PATTERN.search(text)
    if match:
        return match.group(1).replace(",", ".")
    return ""


def _is_plausible_voce(voce: str) -> bool:
    lowered = voce.lower()
    if len(voce) < 8 or len(voce) > 120:
        return False
    reject_markers = (
        "procedura",
        "articolo",
        "decreto",
        "sensu dell",
        "codice dei contratti",
        "stazione appaltante",
        "documentazione di gara",
        "pag.",
        "cig ",
    )
    if any(marker in lowered for marker in reject_markers):
        return False
    if voce.isupper() and len(voce) > 35:
        return False
    return True


def _extract_line_items(text: str) -> list[ExtractedEconomicLineItem]:
    items: list[ExtractedEconomicLineItem] = []
    seen: set[str] = set()

    for match in LINE_ITEM_PATTERN.finditer(text):
        voce = re.sub(r"\s+", " ", match.group(1)).strip(" -–:;.")
        if not _is_plausible_voce(voce):
            continue
        key = voce.lower()[:80]
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "voce": voce[:255],
                "descrizione": "",
                "unita_misura": match.group(3).strip()[:50],
                "quantita": match.group(2).replace(",", "."),
                "prezzo_unitario": (match.group(4) or "").replace(",", "."),
                "source": "documento",
            }
        )

    for match in VOCE_BULLET_PATTERN.finditer(text):
        voce = re.sub(r"\s+", " ", match.group(1)).strip(" -–:;.")
        if not _is_plausible_voce(voce):
            continue
        key = voce.lower()[:80]
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "voce": voce[:255],
                "descrizione": "",
                "unita_misura": "a corpo",
                "quantita": "1",
                "prezzo_unitario": "",
                "source": "documento",
            }
        )

    if ONERI_SICUREZZA_PATTERN.search(text):
        key = "oneri sicurezza"
        if key not in seen:
            items.append(
                {
                    "voce": "Oneri della sicurezza",
                    "descrizione": "Costi sicurezza non soggetti a ribasso",
                    "unita_misura": "a corpo",
                    "quantita": "1",
                    "prezzo_unitario": "",
                    "source": "documento",
                }
            )

    return items[:20]


def parse_economic_structure_from_text(
    text: str,
    *,
    importo_fallback: str = "",
) -> ExtractedEconomicStructure:
    pricing_model = _detect_pricing_model(text)
    importo_base = _extract_importo_base(text, fallback=importo_fallback)
    line_items = _extract_line_items(text)

    plausible_items = [item for item in line_items if _is_plausible_voce(item["voce"])]
    if len(plausible_items) <= 12:
        line_items = plausible_items
    else:
        line_items = []

    if not line_items and importo_base:
        line_items = [
            {
                "voce": "Servizio in oggetto",
                "descrizione": "Importo a base di gara",
                "unita_misura": "a corpo",
                "quantita": "1",
                "prezzo_unitario": importo_base,
                "source": "importo_gara",
            }
        ]

    source_parts = [f"modello {pricing_model.replace('_', ' ')}"]
    if line_items:
        source_parts.append(f"{len(line_items)} voci estratte")
    if importo_base:
        source_parts.append(f"importo base € {importo_base}")

    return {
        "pricing_model": pricing_model,
        "importo_base": importo_base,
        "ribasso_massimo": _extract_ribasso_massimo(text),
        "iva_percentuale": "22",
        "line_items": line_items,
        "source_summary": "; ".join(source_parts),
    }
