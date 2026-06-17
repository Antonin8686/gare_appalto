from __future__ import annotations

from typing import Any

from rag.models import RagChunk
from rag.services.search import build_search_response, contextual_search, semantic_search


def retrieve_generation_context(
    *,
    organization,
    query: str,
    tender_id: int | None = None,
    company_id: int | None = None,
    source_types: list[str] | None = None,
    limit: int = 8,
) -> dict[str, Any]:
    if tender_id is not None or company_id is not None:
        hits = contextual_search(
            organization=organization,
            query=query,
            limit=limit,
            tender_id=tender_id,
            company_id=company_id,
            source_types=source_types,
        )
    else:
        hits = semantic_search(
            organization=organization,
            query=query,
            limit=limit,
            source_types=source_types,
        )

    payload = build_search_response(hits)
    if not payload["sources"]:
        return payload

    return payload


def default_source_types_for_action(action: str) -> list[str]:
    if action == "report_structure":
        return [
            RagChunk.SourceType.TENDER_DOCUMENT,
            RagChunk.SourceType.REQUIREMENT,
            RagChunk.SourceType.TECHNICAL_OFFER,
        ]
    return [
        RagChunk.SourceType.TECHNICAL_OFFER,
        RagChunk.SourceType.TENDER_DOCUMENT,
        RagChunk.SourceType.REQUIREMENT,
        RagChunk.SourceType.COMPANY,
    ]


def format_sources_for_prompt(sources: list[dict[str, Any]], hits: list[dict[str, Any]]) -> str:
    lines = ["FONTI RECUPERATE DAL RAG (obbligatorie da citare):"]
    for index, source in enumerate(sources, start=1):
        label = source.get("title") or f"{source.get('source_type')} #{source.get('source_id')}"
        lines.append(f"[{index}] {label} ({source.get('source_type')})")

    lines.append("")
    lines.append("ESTRATTI:")
    for hit in hits[:8]:
        source_ref = next(
            (
                idx + 1
                for idx, source in enumerate(sources)
                if source.get("source_type") == hit.get("source_type")
                and source.get("source_id") == hit.get("source_id")
            ),
            None,
        )
        ref = f"[{source_ref}]" if source_ref else "[?]"
        excerpt = hit.get("excerpt") or hit.get("text", "")[:500]
        lines.append(f"{ref} {hit.get('title', '')}: {excerpt}")

    return "\n".join(lines)
