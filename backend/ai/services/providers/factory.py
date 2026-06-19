from __future__ import annotations

from django.conf import settings

from ...constants import LlmProvider
from .azure_openai_provider import AzureOpenAiProvider
from .base import LlmProviderClient
from .groq_provider import GroqProvider
from .openai_provider import OpenAiProvider


def get_llm_provider() -> LlmProviderClient:
    provider_name = getattr(settings, "LLM_PROVIDER", LlmProvider.GROQ).lower()
    if provider_name == LlmProvider.AZURE_OPENAI:
        return AzureOpenAiProvider()
    if provider_name == LlmProvider.OPENAI:
        return OpenAiProvider()
    return GroqProvider()


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
    if provider.provider == LlmProvider.GROQ:
        return ""
    return getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
