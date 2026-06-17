from __future__ import annotations

from django.conf import settings

from ...constants import LlmProvider
from .base import LlmCompletion


class OpenAiProvider:
    provider = LlmProvider.OPENAI

    def is_configured(self) -> bool:
        return bool(getattr(settings, "OPENAI_API_KEY", ""))

    def _client(self):
        from openai import OpenAI

        kwargs: dict = {"api_key": settings.OPENAI_API_KEY}
        base_url = getattr(settings, "OPENAI_BASE_URL", "")
        if base_url:
            kwargs["base_url"] = base_url
        return OpenAI(**kwargs)

    def complete(self, *, messages: list[dict[str, str]], temperature: float = 0.4) -> LlmCompletion:
        if not self.is_configured():
            raise RuntimeError("OpenAI non configurato: impostare OPENAI_API_KEY.")

        client = self._client()
        model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
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
