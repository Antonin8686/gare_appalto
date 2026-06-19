from __future__ import annotations

from django.conf import settings

from ...constants import LlmProvider
from .base import LlmCompletion

GROQ_API_BASE_URL = "https://api.groq.com/openai/v1"


class GroqProvider:
    provider = LlmProvider.GROQ

    def is_configured(self) -> bool:
        return bool(getattr(settings, "GROQ_API_KEY", ""))

    def _client(self):
        from openai import OpenAI

        return OpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=GROQ_API_BASE_URL,
        )

    def complete(self, *, messages: list[dict[str, str]], temperature: float = 0.4) -> LlmCompletion:
        if not self.is_configured():
            raise RuntimeError("Groq non configurato: impostare GROQ_API_KEY in backend/.env.")

        client = self._client()
        model = getattr(settings, "GROQ_MODEL", "llama-3.1-8b-instant")
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        choice = response.choices[0].message.content or ""
        usage = response.usage
        return LlmCompletion(
            content=choice.strip(),
            model=response.model or model,
            provider=self.provider,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
        )
