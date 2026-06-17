from functools import lru_cache

from ..constants import EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, MAX_TEXT_CHARS


@lru_cache(maxsize=1)
def _get_embedding_model():
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=EMBEDDING_MODEL)


def generate_embedding(text: str) -> list[float]:
    normalized = text.strip()
    if not normalized:
        return [0.0] * EMBEDDING_DIMENSIONS

    model = _get_embedding_model()
    truncated = normalized[:MAX_TEXT_CHARS]
    embeddings = list(model.embed([truncated]))
    return embeddings[0].tolist()


def index_document_embedding(document) -> None:
    if not document.text_content.strip():
        document.embedding = None
        document.save(update_fields=["embedding"])
        return

    document.embedding = generate_embedding(document.text_content)
    document.save(update_fields=["embedding"])


def index_document_chunks(document) -> int:
    from ..models import DocumentChunk
    from .chunking import split_text_into_chunks

    DocumentChunk.objects.filter(document=document).delete()
    chunks = split_text_into_chunks(document.text_content)
    if not chunks:
        document.embedding = None
        document.save(update_fields=["embedding"])
        return 0

    chunk_objects = []
    for chunk in chunks:
        chunk_objects.append(
            DocumentChunk(
                document=document,
                chunk_index=chunk.index,
                text=chunk.text,
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                embedding=generate_embedding(chunk.text),
            )
        )

    DocumentChunk.objects.bulk_create(chunk_objects)
    document.embedding = chunk_objects[0].embedding
    document.save(update_fields=["embedding"])
    return len(chunk_objects)
