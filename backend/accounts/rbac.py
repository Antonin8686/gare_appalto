from __future__ import annotations

class Role:
    ADMINISTRATOR = "administrator"
    TENDER_MANAGER = "tender_manager"
    TECHNICAL_WRITER = "technical_writer"
    REVIEWER = "reviewer"
    COMPANY_USER = "company_user"
    SCOUTING_MANAGER = "scouting_manager"

    CHOICES = (
        (ADMINISTRATOR, "Administrator"),
        (TENDER_MANAGER, "Tender Manager"),
        (TECHNICAL_WRITER, "Technical Writer"),
        (REVIEWER, "Reviewer"),
        (COMPANY_USER, "Company User"),
        (SCOUTING_MANAGER, "Scouting Manager"),
    )


class Perm:
    TENDERS_VIEW = "tenders.view"
    TENDERS_CREATE = "tenders.create"
    TENDERS_EDIT = "tenders.edit"
    TENDERS_DELETE = "tenders.delete"
    TENDERS_EXPORT = "tenders.export"
    TENDERS_RELATION_EDIT = "tenders.relation.edit"
    TENDERS_RELATION_REVIEW = "tenders.relation.review"
    TENDERS_PARTICIPATION = "tenders.participation"

    COMPANIES_VIEW = "companies.view"
    COMPANIES_CREATE = "companies.create"
    COMPANIES_EDIT = "companies.edit"
    COMPANIES_DELETE = "companies.delete"

    DOCUMENTS_VIEW = "documents.view"
    DOCUMENTS_UPLOAD = "documents.upload"
    DOCUMENTS_DELETE = "documents.delete"

    OFFERS_VIEW = "offers.view"
    OFFERS_CREATE = "offers.create"
    OFFERS_EDIT = "offers.edit"
    OFFERS_DELETE = "offers.delete"

    SCOUTING_VIEW = "scouting.view"
    SCOUTING_IMPORT = "scouting.import"
    SCOUTING_SCORE = "scouting.score"

    ADMIN_USERS_VIEW = "admin.users.view"
    ADMIN_USERS_MANAGE = "admin.users.manage"
    ADMIN_RAG_REINDEX = "admin.rag.reindex"
    ADMIN_AI_USE = "admin.ai.use"


PERMISSION_LABELS: dict[str, str] = {
    Perm.TENDERS_VIEW: "Visualizzare gare",
    Perm.TENDERS_CREATE: "Creare gare",
    Perm.TENDERS_EDIT: "Modificare gare",
    Perm.TENDERS_DELETE: "Eliminare gare",
    Perm.TENDERS_EXPORT: "Esportare documenti gara",
    Perm.TENDERS_RELATION_EDIT: "Modificare relazione tecnica",
    Perm.TENDERS_RELATION_REVIEW: "Validare relazione tecnica",
    Perm.TENDERS_PARTICIPATION: "Analisi partecipazione",
    Perm.COMPANIES_VIEW: "Visualizzare aziende",
    Perm.COMPANIES_CREATE: "Creare aziende",
    Perm.COMPANIES_EDIT: "Modificare aziende",
    Perm.COMPANIES_DELETE: "Eliminare aziende",
    Perm.DOCUMENTS_VIEW: "Visualizzare documenti",
    Perm.DOCUMENTS_UPLOAD: "Caricare documenti",
    Perm.DOCUMENTS_DELETE: "Eliminare documenti",
    Perm.OFFERS_VIEW: "Visualizzare offerte tecniche",
    Perm.OFFERS_CREATE: "Creare offerte tecniche",
    Perm.OFFERS_EDIT: "Modificare offerte tecniche",
    Perm.OFFERS_DELETE: "Eliminare offerte tecniche",
    Perm.SCOUTING_VIEW: "Visualizzare scouting",
    Perm.SCOUTING_IMPORT: "Importare scouting/telemat",
    Perm.SCOUTING_SCORE: "Eseguire scoring scouting",
    Perm.ADMIN_USERS_VIEW: "Visualizzare utenti",
    Perm.ADMIN_USERS_MANAGE: "Gestire utenti e ruoli",
    Perm.ADMIN_RAG_REINDEX: "Reindicizzare RAG",
    Perm.ADMIN_AI_USE: "Usare assistente AI",
}

PERMISSION_GROUPS: dict[str, list[str]] = {
    "gare": [
        Perm.TENDERS_VIEW,
        Perm.TENDERS_CREATE,
        Perm.TENDERS_EDIT,
        Perm.TENDERS_DELETE,
        Perm.TENDERS_EXPORT,
        Perm.TENDERS_RELATION_EDIT,
        Perm.TENDERS_RELATION_REVIEW,
        Perm.TENDERS_PARTICIPATION,
    ],
    "aziende": [
        Perm.COMPANIES_VIEW,
        Perm.COMPANIES_CREATE,
        Perm.COMPANIES_EDIT,
        Perm.COMPANIES_DELETE,
    ],
    "documenti": [
        Perm.DOCUMENTS_VIEW,
        Perm.DOCUMENTS_UPLOAD,
        Perm.DOCUMENTS_DELETE,
    ],
    "offerte": [
        Perm.OFFERS_VIEW,
        Perm.OFFERS_CREATE,
        Perm.OFFERS_EDIT,
        Perm.OFFERS_DELETE,
    ],
    "scouting": [
        Perm.SCOUTING_VIEW,
        Perm.SCOUTING_IMPORT,
        Perm.SCOUTING_SCORE,
    ],
    "amministrazione": [
        Perm.ADMIN_USERS_VIEW,
        Perm.ADMIN_USERS_MANAGE,
        Perm.ADMIN_RAG_REINDEX,
        Perm.ADMIN_AI_USE,
    ],
}

ALL_PERMISSIONS = sorted({perm for perms in PERMISSION_GROUPS.values() for perm in perms})

ROLE_PERMISSIONS: dict[str, set[str]] = {
    Role.ADMINISTRATOR: set(ALL_PERMISSIONS),
    Role.TENDER_MANAGER: {
        Perm.TENDERS_VIEW,
        Perm.TENDERS_CREATE,
        Perm.TENDERS_EDIT,
        Perm.TENDERS_DELETE,
        Perm.TENDERS_EXPORT,
        Perm.TENDERS_RELATION_EDIT,
        Perm.TENDERS_RELATION_REVIEW,
        Perm.TENDERS_PARTICIPATION,
        Perm.COMPANIES_VIEW,
        Perm.DOCUMENTS_VIEW,
        Perm.DOCUMENTS_UPLOAD,
        Perm.DOCUMENTS_DELETE,
        Perm.OFFERS_VIEW,
        Perm.SCOUTING_VIEW,
        Perm.SCOUTING_SCORE,
        Perm.ADMIN_AI_USE,
    },
    Role.TECHNICAL_WRITER: {
        Perm.TENDERS_VIEW,
        Perm.TENDERS_RELATION_EDIT,
        Perm.DOCUMENTS_VIEW,
        Perm.DOCUMENTS_UPLOAD,
        Perm.OFFERS_VIEW,
        Perm.OFFERS_CREATE,
        Perm.OFFERS_EDIT,
        Perm.OFFERS_DELETE,
        Perm.ADMIN_AI_USE,
    },
    Role.REVIEWER: {
        Perm.TENDERS_VIEW,
        Perm.TENDERS_RELATION_REVIEW,
        Perm.TENDERS_EXPORT,
        Perm.COMPANIES_VIEW,
        Perm.DOCUMENTS_VIEW,
        Perm.OFFERS_VIEW,
    },
    Role.COMPANY_USER: {
        Perm.TENDERS_VIEW,
        Perm.COMPANIES_VIEW,
        Perm.COMPANIES_CREATE,
        Perm.COMPANIES_EDIT,
        Perm.DOCUMENTS_VIEW,
        Perm.DOCUMENTS_UPLOAD,
    },
    Role.SCOUTING_MANAGER: {
        Perm.TENDERS_VIEW,
        Perm.TENDERS_CREATE,
        Perm.COMPANIES_VIEW,
        Perm.DOCUMENTS_VIEW,
        Perm.SCOUTING_VIEW,
        Perm.SCOUTING_IMPORT,
        Perm.SCOUTING_SCORE,
    },
}

VIEW_PERMISSION_MAP: dict[tuple[str, str], str] = {
    ("DashboardKPIView", "GET"): Perm.TENDERS_VIEW,
    ("TenderListCreateView", "GET"): Perm.TENDERS_VIEW,
    ("TenderListCreateView", "POST"): Perm.TENDERS_CREATE,
    ("TenderDetailView", "GET"): Perm.TENDERS_VIEW,
    ("TenderDetailView", "PUT"): Perm.TENDERS_EDIT,
    ("TenderDetailView", "PATCH"): Perm.TENDERS_EDIT,
    ("TenderDetailView", "DELETE"): Perm.TENDERS_DELETE,
    ("DocumentListCreateView", "GET"): Perm.DOCUMENTS_VIEW,
    ("DocumentListCreateView", "POST"): Perm.DOCUMENTS_UPLOAD,
    ("DocumentDetailView", "GET"): Perm.DOCUMENTS_VIEW,
    ("DocumentDetailView", "DELETE"): Perm.DOCUMENTS_DELETE,
    ("DocumentDownloadView", "GET"): Perm.DOCUMENTS_VIEW,
    ("RequirementListView", "GET"): Perm.TENDERS_VIEW,
    ("RequirementDetailView", "GET"): Perm.TENDERS_VIEW,
    ("RequirementMatrixView", "GET"): Perm.TENDERS_VIEW,
    ("EvaluationCriterionTreeView", "GET"): Perm.TENDERS_VIEW,
    ("EvaluationCriterionDetailView", "GET"): Perm.TENDERS_VIEW,
    ("TenderEvaluationListView", "GET"): Perm.TENDERS_VIEW,
    ("TenderEvaluationRunView", "POST"): Perm.TENDERS_EDIT,
    ("ScoutingImportListCreateView", "GET"): Perm.SCOUTING_VIEW,
    ("ScoutingImportListCreateView", "POST"): Perm.SCOUTING_IMPORT,
    ("TelematImportListCreateView", "GET"): Perm.SCOUTING_VIEW,
    ("TelematImportListCreateView", "POST"): Perm.SCOUTING_IMPORT,
    ("WelfareImportListCreateView", "GET"): Perm.SCOUTING_VIEW,
    ("WelfareImportListCreateView", "POST"): Perm.SCOUTING_IMPORT,
    ("AnalysisHubView", "GET"): Perm.TENDERS_VIEW,
    ("ScoutingScoreView", "POST"): Perm.SCOUTING_SCORE,
    ("DocumentSearchView", "POST"): Perm.DOCUMENTS_VIEW,
    ("TechnicalRelationDetailView", "GET"): Perm.TENDERS_VIEW,
    ("TechnicalRelationDetailView", "PATCH"): Perm.TENDERS_RELATION_EDIT,
    ("TechnicalRelationOutlineGenerateView", "POST"): Perm.TENDERS_RELATION_EDIT,
    ("TechnicalRelationValidateView", "POST"): Perm.TENDERS_RELATION_REVIEW,
    ("TechnicalRelationVersionListView", "GET"): Perm.TENDERS_VIEW,
    ("TechnicalRelationVersionRestoreView", "POST"): Perm.TENDERS_RELATION_EDIT,
    ("EconomicRelationDetailView", "GET"): Perm.TENDERS_VIEW,
    ("EconomicRelationDetailView", "PATCH"): Perm.TENDERS_RELATION_EDIT,
    ("EconomicRelationOutlineGenerateView", "POST"): Perm.TENDERS_RELATION_EDIT,
    ("EconomicRelationValidateView", "POST"): Perm.TENDERS_RELATION_REVIEW,
    ("EconomicRelationVersionListView", "GET"): Perm.TENDERS_VIEW,
    ("EconomicRelationVersionRestoreView", "POST"): Perm.TENDERS_RELATION_EDIT,
    ("TenderOffersAutoGenerateView", "POST"): Perm.TENDERS_RELATION_EDIT,
    ("TenderExportOptionsView", "GET"): Perm.TENDERS_EXPORT,
    ("TenderExportView", "POST"): Perm.TENDERS_EXPORT,
    ("CompanyListCreateView", "GET"): Perm.COMPANIES_VIEW,
    ("CompanyListCreateView", "POST"): Perm.COMPANIES_CREATE,
    ("CompanyDetailView", "GET"): Perm.COMPANIES_VIEW,
    ("CompanyDetailView", "PUT"): Perm.COMPANIES_EDIT,
    ("CompanyDetailView", "PATCH"): Perm.COMPANIES_EDIT,
    ("CompanyDetailView", "DELETE"): Perm.COMPANIES_DELETE,
    ("CompanyDocumentListCreateView", "GET"): Perm.DOCUMENTS_VIEW,
    ("CompanyDocumentListCreateView", "POST"): Perm.DOCUMENTS_UPLOAD,
    ("CompanyDocumentDetailView", "GET"): Perm.DOCUMENTS_VIEW,
    ("CompanyDocumentDetailView", "DELETE"): Perm.DOCUMENTS_DELETE,
    ("CompanyDocumentDownloadView", "GET"): Perm.DOCUMENTS_VIEW,
    ("CompanyDocumentExpiringView", "GET"): Perm.COMPANIES_VIEW,
    ("RTIListCreateView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("RTIListCreateView", "POST"): Perm.TENDERS_PARTICIPATION,
    ("RTIDetailView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("RTIDetailView", "PUT"): Perm.TENDERS_PARTICIPATION,
    ("RTIDetailView", "PATCH"): Perm.TENDERS_PARTICIPATION,
    ("RTIDetailView", "DELETE"): Perm.TENDERS_PARTICIPATION,
    ("ConsorzioListCreateView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("ConsorzioListCreateView", "POST"): Perm.TENDERS_PARTICIPATION,
    ("ConsorzioDetailView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("ConsorzioDetailView", "PUT"): Perm.TENDERS_PARTICIPATION,
    ("ConsorzioDetailView", "PATCH"): Perm.TENDERS_PARTICIPATION,
    ("ConsorzioDetailView", "DELETE"): Perm.TENDERS_PARTICIPATION,
    ("ImpresaAusiliariaListCreateView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("ImpresaAusiliariaListCreateView", "POST"): Perm.TENDERS_PARTICIPATION,
    ("ImpresaAusiliariaDetailView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("ImpresaAusiliariaDetailView", "PUT"): Perm.TENDERS_PARTICIPATION,
    ("ImpresaAusiliariaDetailView", "PATCH"): Perm.TENDERS_PARTICIPATION,
    ("ImpresaAusiliariaDetailView", "DELETE"): Perm.TENDERS_PARTICIPATION,
    ("ParticipationAnalysisView", "GET"): Perm.TENDERS_PARTICIPATION,
    ("ParticipationAnalysisView", "POST"): Perm.TENDERS_PARTICIPATION,
    ("TechnicalOfferListCreateView", "GET"): Perm.OFFERS_VIEW,
    ("TechnicalOfferListCreateView", "POST"): Perm.OFFERS_CREATE,
    ("TechnicalOfferDetailView", "GET"): Perm.OFFERS_VIEW,
    ("TechnicalOfferDetailView", "PUT"): Perm.OFFERS_EDIT,
    ("TechnicalOfferDetailView", "PATCH"): Perm.OFFERS_EDIT,
    ("TechnicalOfferDetailView", "DELETE"): Perm.OFFERS_DELETE,
    ("TechnicalOfferFacetView", "GET"): Perm.OFFERS_VIEW,
    ("TechnicalOfferImportView", "POST"): Perm.OFFERS_CREATE,
    ("TechnicalOfferLibraryMatchView", "GET"): Perm.OFFERS_VIEW,
    ("RagSearchView", "POST"): Perm.DOCUMENTS_VIEW,
    ("RagContextualSearchView", "POST"): Perm.DOCUMENTS_VIEW,
    ("RagRetrieveSourcesView", "POST"): Perm.DOCUMENTS_VIEW,
    ("RagReindexView", "POST"): Perm.ADMIN_RAG_REINDEX,
    ("AiConfigView", "GET"): Perm.TENDERS_VIEW,
    ("AiGenerateView", "POST"): Perm.ADMIN_AI_USE,
    ("AiGenerationListView", "GET"): Perm.ADMIN_AI_USE,
    ("OrganizationUserListView", "GET"): Perm.ADMIN_USERS_VIEW,
    ("OrganizationUserDetailView", "GET"): Perm.ADMIN_USERS_VIEW,
    ("OrganizationUserDetailView", "PATCH"): Perm.ADMIN_USERS_MANAGE,
    ("OrganizationUserDetailView", "DELETE"): Perm.ADMIN_USERS_MANAGE,
    ("OrganizationUserCreateView", "POST"): Perm.ADMIN_USERS_MANAGE,
    ("RolePermissionMatrixView", "GET"): Perm.ADMIN_USERS_VIEW,
}


def get_role_permissions(role: str) -> set[str]:
    if not role:
        return set()
    return set(ROLE_PERMISSIONS.get(role, set()))


def user_has_permission(user, permission: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = getattr(user, "role", None) or Role.COMPANY_USER
    return permission in get_role_permissions(role)


def get_user_permissions(user) -> list[str]:
    if not user or not user.is_authenticated:
        return []
    if user.is_superuser:
        return list(ALL_PERMISSIONS)
    return sorted(get_role_permissions(getattr(user, "role", None) or Role.COMPANY_USER))


def get_required_permission(view, method: str) -> str | None:
    return VIEW_PERMISSION_MAP.get((view.__class__.__name__, method.upper()))


def default_role_for_organization(organization) -> str:
    from .models import User

    if organization is None:
        return Role.COMPANY_USER
    has_admin = User.objects.filter(
        organization=organization,
        role=Role.ADMINISTRATOR,
    ).exists()
    return Role.ADMINISTRATOR if not has_admin else Role.COMPANY_USER
