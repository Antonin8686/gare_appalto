"""Recupero contenuti dalla libreria OT per sezioni offerta e auto-generazione."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Q

from rag.models import RagChunk

from ..models import TechnicalOffer

MIN_SIMILARITY = 0.32


def _serialize_offer_match(
    *,
    offer: TechnicalOffer,
    similarity: float | None = None,
    excerpt: str = "",
) -> dict[str, Any]:
    return {
        "offer_id": offer.id,
        "title": offer.title,
        "category": offer.category,
        "category_label": offer.get_category_display(),
        "settore": offer.settore,
        "content": offer.content,
        "excerpt": excerpt or offer.content[:280],
        "similarity": similarity,
        "url_path": f"/technical-offers/{offer.id}",
    }


def _db_fallback_matches(
    *,
    organization,
    section_title: str,
    category: str,
    limit: int,
) -> list[dict[str, Any]]:
    queryset = TechnicalOffer.objects.filter(organization=organization)
    if category:
        queryset = queryset.filter(category=category)

    title_query = section_title.strip()
    if title_query:
        queryset = queryset.filter(
            Q(title__icontains=title_query)
            | Q(content__icontains=title_query)
            | Q(parole_chiave__icontains=title_query)
        )

    offers = list(queryset.order_by("-riutilizzabilita", "-updated_at")[:limit])
    return [_serialize_offer_match(offer=offer) for offer in offers]


def find_library_matches(
    *,
    organization,
    section_title: str,
    category: str = "",
    tender_oggetto: str = "",
    limit: int = 5,
) -> list[dict[str, Any]]:
    if organization is None:
        return []

    query = " ".join(part for part in (section_title, category.replace("_", " "), tender_oggetto) if part)
    hits: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    try:
        from rag.services.search import semantic_search

        rag_hits = semantic_search(
            organization=organization,
            query=query,
            limit=limit * 2,
            source_types=[RagChunk.SourceType.TECHNICAL_OFFER],
        )
        for hit in rag_hits:
            offer_id = hit.get("source_id")
            if not offer_id or offer_id in seen_ids:
                continue
            similarity = hit.get("similarity")
            if similarity is not None and similarity < MIN_SIMILARITY:
                continue
            try:
                offer = TechnicalOffer.objects.get(pk=offer_id, organization=organization)
            except TechnicalOffer.DoesNotExist:
                continue
            if category and offer.category != category:
                continue
            seen_ids.add(offer_id)
            hits.append(
                _serialize_offer_match(
                    offer=offer,
                    similarity=similarity,
                    excerpt=hit.get("excerpt") or "",
                )
            )
            if len(hits) >= limit:
                return hits
    except Exception:
        pass

    for match in _db_fallback_matches(
        organization=organization,
        section_title=section_title,
        category=category,
        limit=limit,
    ):
        if match["offer_id"] in seen_ids:
            continue
        hits.append(match)
        seen_ids.add(match["offer_id"])
        if len(hits) >= limit:
            break

    return hits


def build_section_content_from_library(
    *,
    library_content: str,
    section_title: str,
    source_title: str = "",
    criterion_description: str = "",
    punteggio_massimo: Decimal | None = None,
    soglia_minima: str = "",
    tender_oggetto: str = "",
) -> str:
    lines = [f"# {section_title}", ""]
    if criterion_description:
        lines.append(criterion_description.strip())
    elif tender_oggetto:
        lines.append(f"**Oggetto gara:** {tender_oggetto.strip()}")

    if punteggio_massimo is not None:
        lines.extend(["", f"**Punteggio massimo:** {punteggio_massimo}"])
    if soglia_minima:
        lines.extend(["", f"**Soglia minima:** {soglia_minima}"])

    lines.extend(["", library_content.strip()])
    if source_title:
        lines.extend(["", f"*Fonte libreria: {source_title}*"])
    return "\n".join(lines).strip()


def best_library_match_for_section(
    *,
    organization,
    section_title: str,
    category: str,
    tender_oggetto: str = "",
) -> dict[str, Any] | None:
    matches = find_library_matches(
        organization=organization,
        section_title=section_title,
        category=category,
        tender_oggetto=tender_oggetto,
        limit=1,
    )
    return matches[0] if matches else None
