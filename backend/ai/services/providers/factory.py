from __future__ import annotations

from django.conf import settings

from ...constants import LlmProvider
from .azure_openai_provider import AzureOpenAiProvider
from .base import LlmProviderClient
from .openai_provider import OpenAiProvider


def get_llm_provider() -> LlmProviderClient:
    provider_name = getattr(settings, "LLM_PROVIDER", LlmProvider.OPENAI).lower()
    if provider_name == LlmProvider.AZURE_OPENAI:
        return AzureOpenAiProvider()
    return OpenAiProvider()


def get_llm_status() -> dict:
    provider = get_llm_provider()
    return {
        "provider": provider.provider,
        "model": _resolved_model_name(provider),
        "configured": provider.is_configured(),
    }


def _resolved_model_name(provider: LlmProviderClient) -> str:
    if provider.provider == LlmProvider.AZURE_OPENAI:
        return getattr(settings, "AZURE_OPENAI_DEPLOYMENT", "")
    return getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
