from dataclasses import dataclass

from ..constants import CHUNK_OVERLAP, CHUNK_SIZE


@dataclass(frozen=True)
class TextChunk:
    index: int
    text: str
    char_start: int
    char_end: int


def split_text_into_chunks(
    text: str,
    *,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[TextChunk]:
    normalized = text.strip()
    if not normalized:
        return []

    if len(normalized) <= chunk_size:
        return [TextChunk(index=0, text=normalized, char_start=0, char_end=len(normalized))]

    chunks: list[TextChunk] = []
    start = 0
    index = 0

    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        if end < len(normalized):
            boundary = normalized.rfind("\n", start + chunk_size // 2, end)
            if boundary > start:
                end = boundary + 1
            else:
                boundary = normalized.rfind(" ", start + chunk_size // 2, end)
                if boundary > start:
                    end = boundary + 1

        chunk_text = normalized[start:end].strip()
        if chunk_text:
            chunks.append(
                TextChunk(
                    index=index,
                    text=chunk_text,
                    char_start=start,
                    char_end=end,
                )
            )
            index += 1

        if end >= len(normalized):
            break
        start = max(end - overlap, start + 1)

    return chunks
