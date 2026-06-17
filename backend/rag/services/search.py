from __future__ import annotations

from typing import Any

from pgvector.django import CosineDistance

from ..models import RagChunk
from .embeddings import generate_embedding


def _build_excerpt(text: str, query: str, max_length: int = 280) -> str:
    normalized = " ".join(text.split())
    if not normalized:
        return ""

    lowered_text = normalized.lower()
    query_terms = [term for term in query.lower().split() if len(term) >= 3]
    match_index = -1
    for term in query_terms:
        index = lowered_text.find(term)
        if index >= 0:
            match_index = index
            break

    if match_index < 0:
        excerpt = normalized[:max_length]
        truncated = len(normalized) > max_length
        start = 0
    else:
        start = max(0, match_index - 80)
        excerpt = normalized[start : start + max_length]
        truncated = len(normalized) > start + max_length

    if start > 0:
        excerpt = f"…{excerpt}"
    if truncated:
        excerpt = f"{excerpt}…"

    return excerpt


def _chunk_queryset(organization, source_types: list[str] | None = None):
    queryset = RagChunk.objects.filter(organization=organization)
    if source_types:
        queryset = queryset.filter(source_type__in=source_types)
    return queryset


def semantic_search(
    *,
    organization,
    query: str,
    limit: int = 10,
    source_types: list[str] | None = None,
) -> list[dict[str, Any]]:
    query_embedding = generate_embedding(query)
    chunks = (
        _chunk_queryset(organization, source_types)
        .annotate(distance=CosineDistance("embedding", query_embedding))
        .order_by("distance")[:limit]
    )
    return [_serialize_hit(chunk, query) for chunk in chunks]


def contextual_search(
    *,
    organization,
    query: str,
    limit: int = 10,
    tender_id: int | None = None,
    company_id: int | None = None,
    source_types: list[str] | None = None,
) -> list[dict[str, Any]]:
    from django.db.models import Q

    query_embedding = generate_embedding(query)
    queryset = _chunk_queryset(organization, source_types)
    context_filter = Q()

    if tender_id is not None:
        context_filter &= Q(metadata__tender_id=tender_id)
    if company_id is not None:
        context_filter &= Q(source_type=RagChunk.SourceType.COMPANY, source_id=company_id) | Q(
            metadata__company_id=company_id
        )

    if context_filter:
        queryset = queryset.filter(context_filter)

    chunks = queryset.annotate(distance=CosineDistance("embedding", query_embedding)).order_by(
        "distance"
    )[:limit]
    return [_serialize_hit(chunk, query) for chunk in chunks]


def retrieve_sources(
    *,
    organization,
    chunk_ids: list[int] | None = None,
    sources: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    chunks: list[RagChunk] = []
    if chunk_ids:
        chunks = list(
            RagChunk.objects.filter(organization=organization, id__in=chunk_ids).order_by(
                "source_type", "source_id", "chunk_index"
            )
        )
    elif sources:
        for source in sources:
            source_type = source.get("source_type")
            source_id = source.get("source_id")
            if not source_type or not source_id:
                continue
            chunks.extend(
                RagChunk.objects.filter(
                    organization=organization,
                    source_type=source_type,
                    source_id=source_id,
                ).order_by("chunk_index")
            )

    hits = [_serialize_hit(chunk, "") for chunk in chunks]
    return {
        "results": hits,
        "sources": collect_sources(hits),
    }


def collect_sources(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, int]] = set()
    sources: list[dict[str, Any]] = []

    for hit in hits:
        source = hit["source"]
        key = (source["source_type"], source["source_id"])
        if key in seen:
            continue
        seen.add(key)
        sources.append(source)

        document = hit.get("document")
        if document:
            doc_key = ("tender_document", document["id"])
            if doc_key not in seen:
                seen.add(doc_key)
                sources.append(
                    {
                        "source_type": RagChunk.SourceType.TENDER_DOCUMENT,
                        "source_id": document["id"],
                        "title": document["name"],
                        "url_path": document.get("url_path"),
                        "original_filename": document.get("original_filename"),
                    }
                )

    return sources


def _serialize_hit(chunk: RagChunk, query: str) -> dict[str, Any]:
    similarity = max(0.0, 1.0 - chunk.distance) if hasattr(chunk, "distance") else None
    metadata = chunk.metadata or {}
    source = {
        "source_type": chunk.source_type,
        "source_id": chunk.source_id,
        "title": chunk.title,
        "url_path": metadata.get("url_path"),
        "chunk_index": chunk.chunk_index,
    }

    document = None
    document_id = metadata.get("document_id")
    if document_id:
        document = {
            "id": document_id,
            "name": metadata.get("document_name") or metadata.get("original_filename") or "",
            "original_filename": metadata.get("original_filename"),
            "url_path": metadata.get("document_url_path") or metadata.get("tender_url_path"),
        }

    return {
        "id": chunk.id,
        "source_type": chunk.source_type,
        "source_type_label": chunk.get_source_type_display(),
        "source_id": chunk.source_id,
        "chunk_index": chunk.chunk_index,
        "title": chunk.title,
        "excerpt": _build_excerpt(chunk.text, query),
        "text": chunk.text,
        "similarity": round(similarity, 4) if similarity is not None else None,
        "metadata": metadata,
        "source": source,
        "document": document,
        "indexed_at": chunk.indexed_at.isoformat() if chunk.indexed_at else None,
    }


def build_search_response(hits: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "results": hits,
        "sources": collect_sources(hits),
    }
