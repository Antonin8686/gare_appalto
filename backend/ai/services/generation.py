from __future__ import annotations

from typing import Any

from accounts.models import Organization
from tenders.models import Tender

from ..constants import AiActionType
from ..models import AiGeneration
from .prompts import build_system_prompt, build_user_prompt
from .providers.factory import get_llm_provider
from .rag_context import (
    default_source_types_for_action,
    format_sources_for_prompt,
    retrieve_generation_context,
)


class AiGenerationError(Exception):
    def __init__(self, message: str, *, code: str = "generation_error"):
        super().__init__(message)
        self.code = code


def run_ai_generation(
    *,
    organization: Organization,
    user,
    action: str,
    tender: Tender | None = None,
    company_id: int | None = None,
    section_id: str = "",
    section_title: str = "",
    section_content: str = "",
    criterion_description: str = "",
    instructions: str = "",
    rag_query: str = "",
) -> dict[str, Any]:
    if action not in AiActionType.CHOICES:
        raise AiGenerationError(f"Azione non supportata: {action}", code="invalid_action")

    provider = get_llm_provider()
    if not provider.is_configured():
        raise AiGenerationError(
            "Groq non configurato. Impostare GROQ_API_KEY in backend/.env.",
            code="provider_not_configured",
        )

    query = _build_rag_query(
        action=action,
        rag_query=rag_query,
        section_title=section_title,
        section_content=section_content,
        criterion_description=criterion_description,
        instructions=instructions,
    )

    tender_id = tender.id if tender else None
    rag_payload = retrieve_generation_context(
        organization=organization,
        query=query,
        tender_id=tender_id,
        company_id=company_id,
        source_types=default_source_types_for_action(action),
        limit=10,
    )

    sources = rag_payload.get("sources") or []
    hits = rag_payload.get("results") or []
    if not sources:
        raise AiGenerationError(
            "Impossibile generare senza fonti RAG. Eseguire la reindicizzazione o "
            "arricchire i documenti della gara.",
            code="missing_rag_sources",
        )

    context_block = format_sources_for_prompt(sources, hits)
    company_name = _resolve_company_name(company_id)
    user_prompt = build_user_prompt(
        action=action,
        context_block=context_block,
        section_title=section_title,
        section_content=section_content,
        criterion_description=criterion_description,
        instructions=instructions,
        tender_cig=tender.cig if tender else "",
        company_name=company_name,
    )
    messages = [
        {"role": "system", "content": build_system_prompt()},
        {"role": "user", "content": user_prompt},
    ]

    completion = provider.complete(messages=messages, temperature=0.35)
    content = _ensure_sources_section(completion.content, sources)

    record = AiGeneration.objects.create(
        organization=organization,
        user=user,
        tender=tender,
        section_id=section_id,
        action_type=action,
        prompt=user_prompt,
        prompt_messages=messages,
        model=completion.model,
        provider=completion.provider,
        response=content,
        sources=sources,
        rag_chunks=hits,
        prompt_tokens=completion.prompt_tokens,
        completion_tokens=completion.completion_tokens,
    )

    return {
        "id": record.id,
        "action_type": record.action_type,
        "content": record.response,
        "model": record.model,
        "provider": record.provider,
        "prompt": record.prompt,
        "sources": record.sources,
        "rag_chunks": record.rag_chunks,
        "created_at": record.created_at.isoformat(),
    }


def _build_rag_query(
    *,
    action: str,
    rag_query: str,
    section_title: str,
    section_content: str,
    criterion_description: str,
    instructions: str,
) -> str:
    if rag_query.strip():
        return rag_query.strip()

    parts = [section_title, criterion_description, instructions]
    if action in (AiActionType.IMPROVEMENT_PROPOSAL, AiActionType.CONTENT_ADAPTATION):
        parts.append(section_content[:1500])
    if action == AiActionType.REPORT_STRUCTURE:
        parts.extend(["struttura relazione tecnica", "criteri di valutazione", "requisiti"])
    return " ".join(part.strip() for part in parts if part and part.strip()) or "relazione tecnica gara"


def _resolve_company_name(company_id: int | None) -> str:
    if not company_id:
        return ""
    from companies.models import Company

    company = Company.objects.filter(pk=company_id).first()
    return company.name if company else ""


def _ensure_sources_section(content: str, sources: list[dict[str, Any]]) -> str:
    if "## Fonti utilizzate" in content or "## fonti utilizzate" in content.lower():
        return content

    lines = [content.strip(), "", "## Fonti utilizzate"]
    for index, source in enumerate(sources, start=1):
        title = source.get("title") or f"{source.get('source_type')} #{source.get('source_id')}"
        lines.append(f"- [{index}] {title}")
    return "\n".join(lines).strip()
