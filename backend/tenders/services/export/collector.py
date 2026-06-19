from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from accounts.models import Organization
from companies.models import Company
from participations.services.coverage import FORMA_SINGOLA, ParticipationAnalysis, analyze_participation
from participations.services.suggestion import suggest_participation_form

from ...models import Tender
from ..outline_generation import get_or_create_technical_relation
from ..economic_outline_generation import get_or_create_economic_relation
from ..requirement_matrix import RequirementMatrix, build_requirement_matrix


@dataclass
class TenderExportContext:
    tender: Tender
    scheda: dict[str, Any]
    matrix: RequirementMatrix
    participation: ParticipationAnalysis
    participation_suggestion: dict[str, Any] | None
    relation: dict[str, Any]
    economic_relation: dict[str, Any]
    exported_at: str


def collect_export_context(
    tender: Tender,
    user,
    *,
    participation_params: dict[str, Any] | None = None,
    matrix_company_ids: list[int] | None = None,
) -> TenderExportContext:
    from accounts.tenancy import filter_by_organization

    companies = list(
        filter_by_organization(Company.objects.all(), user).order_by("name")
    )
    if matrix_company_ids:
        company_set = set(matrix_company_ids)
        matrix_companies = [company for company in companies if company.id in company_set]
    else:
        matrix_companies = companies

    matrix = build_requirement_matrix(
        tender,
        matrix_companies,
        company_ids=matrix_company_ids,
    )

    participation_companies = companies
    forma = FORMA_SINGOLA
    ripartizione = None
    avvalimenti = None
    suggestion_dict = None

    if participation_params:
        forma = participation_params.get("forma", FORMA_SINGOLA)
        company_ids = participation_params.get("company_ids") or []
        if company_ids:
            participation_companies = [
                company for company in companies if company.id in company_ids
            ]
        ripartizione = participation_params.get("ripartizione_requisiti")
        avvalimenti = participation_params.get("avvalimenti")
        participation = analyze_participation(
            tender,
            forma=forma,
            companies=participation_companies,
            ripartizione_requisiti=ripartizione,
            avvalimenti=avvalimenti,
        )
    else:
        suggestion, participation = suggest_participation_form(tender, companies)
        suggestion_dict = suggestion.to_dict()

    relation_model = get_or_create_technical_relation(tender)
    company_name = relation_model.company.name if relation_model.company_id else ""
    relation = {
        "company_name": company_name,
        "outline": relation_model.outline or {},
        "sections": relation_model.sections or [],
        "generated_at": (
            relation_model.generated_at.isoformat() if relation_model.generated_at else None
        ),
    }

    economic_model = get_or_create_economic_relation(tender)
    economic_company = economic_model.company.name if economic_model.company_id else ""
    economic_relation = {
        "company_name": economic_company,
        "outline": economic_model.outline or {},
        "line_items": economic_model.line_items or [],
        "generated_at": (
            economic_model.generated_at.isoformat() if economic_model.generated_at else None
        ),
    }

    exported_at = date.today().isoformat()
    scheda = _build_scheda(tender, user.organization)

    return TenderExportContext(
        tender=tender,
        scheda=scheda,
        matrix=matrix,
        participation=participation,
        participation_suggestion=suggestion_dict,
        relation=relation,
        economic_relation=economic_relation,
        exported_at=exported_at,
    )


def _build_scheda(tender: Tender, organization: Organization | None) -> dict[str, Any]:
    formal_rules = tender.formal_rules or {}
    return {
        "cig": tender.cig,
        "cpv": tender.cpv,
        "oggetto": tender.oggetto,
        "importo": str(tender.importo),
        "scadenza": tender.scadenza.isoformat(),
        "stato": tender.get_stato_display(),
        "fase": tender.get_fase_display(),
        "source": tender.get_source_display(),
        "priorita": tender.get_priorita_display(),
        "priority_score": tender.priority_score,
        "ai_extracted": tender.ai_extracted,
        "extracted_at": tender.extracted_at.isoformat() if tender.extracted_at else "",
        "formal_rules": formal_rules,
        "organization": organization.name if organization else "",
        "created_at": tender.created_at.isoformat(),
        "updated_at": tender.updated_at.isoformat(),
    }
