from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class LlmCompletion:
    content: str
    model: str
    provider: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class LlmProviderClient(Protocol):
    provider: str

    def complete(self, *, messages: list[dict[str, str]], temperature: float = 0.4) -> LlmCompletion:
        ...

    def is_configured(self) -> bool:
        ...
