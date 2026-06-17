from pgvector.django import CosineDistance

from ..models import Document, DocumentChunk, Tender
from .embeddings import generate_embedding


def search_similar_documents(
    *,
    organization,
    query: str,
    limit: int = 10,
    fase: str | None = None,
) -> list[dict]:
    query_embedding = generate_embedding(query)

    queryset = (
        DocumentChunk.objects.filter(
            document__tender__organization=organization,
            document__status=Document.Status.DONE,
            embedding__isnull=False,
        )
        .select_related("document", "document__tender")
        .annotate(distance=CosineDistance("embedding", query_embedding))
    )

    if fase:
        queryset = queryset.filter(document__tender__fase=fase)

    chunks = queryset.order_by("distance")[:limit]

    results = []
    for chunk in chunks:
        similarity = max(0.0, 1.0 - chunk.distance)
        results.append(
            {
                "chunk": chunk,
                "document": chunk.document,
                "similarity": round(similarity, 4),
                "excerpt": _build_excerpt(chunk.text, query),
            }
        )

    if results:
        return results

    return _search_document_level(
        organization=organization,
        query=query,
        query_embedding=query_embedding,
        limit=limit,
        fase=fase,
    )


def _search_document_level(
    *,
    organization,
    query: str,
    query_embedding: list[float],
    limit: int,
    fase: str | None,
) -> list[dict]:
    queryset = (
        Document.objects.filter(
            tender__organization=organization,
            status=Document.Status.DONE,
            embedding__isnull=False,
        )
        .select_related("tender")
        .annotate(distance=CosineDistance("embedding", query_embedding))
    )

    if fase:
        queryset = queryset.filter(tender__fase=fase)

    documents = queryset.order_by("distance")[:limit]
    results = []
    for document in documents:
        similarity = max(0.0, 1.0 - document.distance)
        results.append(
            {
                "chunk": None,
                "document": document,
                "similarity": round(similarity, 4),
                "excerpt": _build_excerpt(document.text_content, query),
            }
        )
    return results


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
