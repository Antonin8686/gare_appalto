from datetime import date, timedelta

from django.db.models import Q, QuerySet

from ..models import CompanyDocument

DEFAULT_EXPIRY_WARNING_DAYS = 30


def compute_stato_validita(
    data_scadenza: date | None,
    *,
    today: date | None = None,
    warning_days: int = DEFAULT_EXPIRY_WARNING_DAYS,
) -> str:
    if not data_scadenza:
        return CompanyDocument.StatoValidita.SENZA_SCADENZA

    today = today or date.today()
    days_remaining = (data_scadenza - today).days

    if days_remaining < 0:
        return CompanyDocument.StatoValidita.SCADUTO
    if days_remaining <= warning_days:
        return CompanyDocument.StatoValidita.IN_SCADENZA
    return CompanyDocument.StatoValidita.VALIDO


def days_until_expiry(data_scadenza: date | None, *, today: date | None = None) -> int | None:
    if not data_scadenza:
        return None
    today = today or date.today()
    return (data_scadenza - today).days


def filter_company_documents(
    queryset: QuerySet,
    *,
    query: str | None = None,
    categoria: str | None = None,
    stato_validita: str | None = None,
) -> QuerySet:
    if query:
        queryset = queryset.filter(
            Q(original_filename__icontains=query) | Q(note__icontains=query)
        )
    if categoria:
        queryset = queryset.filter(categoria=categoria)
    if stato_validita:
        queryset = queryset.filter(stato_validita=stato_validita)
    return queryset


def get_expiring_documents(
    organization,
    *,
    days: int = DEFAULT_EXPIRY_WARNING_DAYS,
    company_id: int | None = None,
    today: date | None = None,
) -> QuerySet:
    today = today or date.today()
    threshold = today + timedelta(days=days)
    queryset = CompanyDocument.objects.filter(
        company__organization=organization,
        data_scadenza__isnull=False,
        data_scadenza__lte=threshold,
    ).select_related("company")

    if company_id is not None:
        queryset = queryset.filter(company_id=company_id)

    return queryset.order_by("data_scadenza", "company__name")
