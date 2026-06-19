from __future__ import annotations

from django.utils import timezone

from ..models import EvaluationCriterion, Requirement, Tender
from .export.collector import _build_scheda


def _requirements_summary(tender: Tender) -> dict:
    counts: dict[str, int] = {}
    for req in Requirement.objects.filter(tender=tender).values("categoria"):
        cat = req["categoria"]
        counts[cat] = counts.get(cat, 0) + 1
    return {
        "total": sum(counts.values()),
        "by_categoria": counts,
        "items": list(
            Requirement.objects.filter(tender=tender)
            .order_by("categoria", "id")[:50]
            .values("categoria", "tipo", "descrizione", "soglia")
        ),
    }


def _criteria_summary(tender: Tender) -> dict:
    criteria = EvaluationCriterion.objects.filter(tender=tender, parent__isnull=True).order_by(
        "ordine", "id"
    )
    return {
        "total": EvaluationCriterion.objects.filter(tender=tender).count(),
        "top_level": [
            {
                "titolo": c.titolo,
                "punteggio_massimo": str(c.punteggio_massimo) if c.punteggio_massimo else None,
                "subcriteri": c.children.count(),
            }
            for c in criteria[:20]
        ],
    }


def _required_documents_summary(tender: Tender) -> dict:
    formal_rules = tender.formal_rules or {}
    allegati = formal_rules.get("allegati", [])
    if not isinstance(allegati, list):
        allegati = []
    return {
        "total": len(allegati),
        "amministrativi": [a for a in allegati if "ammin" in str(a.get("label", "")).lower()],
        "tecnici": [a for a in allegati if "tecnic" in str(a.get("label", "")).lower()],
        "economici": [a for a in allegati if "economic" in str(a.get("label", "")).lower()],
        "allegati": allegati,
    }


def _economic_summary(tender: Tender) -> dict:
    from ..economic_outline_generation import get_or_create_economic_relation

    relation = get_or_create_economic_relation(tender)
    outline = relation.outline or {}
    line_items = relation.line_items or []
    return {
        "total_voci": len(line_items),
        "pricing_model": outline.get("pricing_model", ""),
        "importo_base": outline.get("importo_base", ""),
        "totals": outline.get("totals", {}),
        "auto_generated": relation.auto_generated,
        "line_items": line_items[:50],
    }


def build_tender_scheda(tender: Tender) -> dict:
    organization = tender.organization
    scheda = _build_scheda(tender, organization)
    scheda.update(
        {
            "stazione_appaltante": tender.stazione_appaltante,
            "durata": tender.durata,
            "document_url": tender.document_url,
            "dati_generali": {
                "oggetto": tender.oggetto,
                "stazione_appaltante": tender.stazione_appaltante,
                "cig": tender.cig,
                "cpv": tender.cpv,
                "importo": str(tender.importo),
                "durata": tender.durata,
                "scadenza": tender.scadenza.isoformat(),
            },
            "requisiti": _requirements_summary(tender),
            "offerta_tecnica": _criteria_summary(tender),
            "offerta_economica": _economic_summary(tender),
            "documenti_richiesti": _required_documents_summary(tender),
        }
    )
    return scheda


def save_tender_scheda(tender: Tender) -> dict:
    scheda = build_tender_scheda(tender)
    tender.scheda = scheda
    tender.scheda_generated_at = timezone.now()
    tender.save(update_fields=["scheda", "scheda_generated_at", "updated_at"])
    return scheda
