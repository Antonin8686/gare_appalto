from functools import lru_cache

from ..constants import EMBEDDING_DIMENSIONS, EMBEDDING_MODEL_NAME, MAX_TEXT_CHARS


@lru_cache(maxsize=1)
def _get_embedding_model():
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=EMBEDDING_MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    normalized = text.strip()
    if not normalized:
        return [0.0] * EMBEDDING_DIMENSIONS

    model = _get_embedding_model()
    truncated = normalized[:MAX_TEXT_CHARS]
    embeddings = list(model.embed([truncated]))
    return embeddings[0].tolist()
