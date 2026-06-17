from __future__ import annotations

from django.conf import settings

from ...constants import LlmProvider
from .base import LlmCompletion


class AzureOpenAiProvider:
    provider = LlmProvider.AZURE_OPENAI

    def is_configured(self) -> bool:
        return bool(
            getattr(settings, "AZURE_OPENAI_API_KEY", "")
            and getattr(settings, "AZURE_OPENAI_ENDPOINT", "")
            and getattr(settings, "AZURE_OPENAI_DEPLOYMENT", "")
        )

    def _client(self):
        from openai import AzureOpenAI

        return AzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=getattr(settings, "AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
        )

    def complete(self, *, messages: list[dict[str, str]], temperature: float = 0.4) -> LlmCompletion:
        if not self.is_configured():
            raise RuntimeError(
                "Azure OpenAI non configurato: impostare AZURE_OPENAI_API_KEY, "
                "AZURE_OPENAI_ENDPOINT e AZURE_OPENAI_DEPLOYMENT."
            )

        client = self._client()
        deployment = settings.AZURE_OPENAI_DEPLOYMENT
        response = client.chat.completions.create(
            model=deployment,
            messages=messages,
            temperature=temperature,
        )
        choice = response.choices[0].message.content or ""
        usage = response.usage
        return LlmCompletion(
            content=choice.strip(),
            model=deployment,
            provider=self.provider,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
        )
