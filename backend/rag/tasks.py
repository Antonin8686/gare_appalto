from celery import shared_task


@shared_task(bind=True, max_retries=1, default_retry_delay=60)
def reindex_organization_task(self, organization_id: int, scope: str = "all") -> dict:
    from accounts.models import Organization

    from .services.indexing import reindex_organization

    try:
        organization = Organization.objects.get(pk=organization_id)
    except Organization.DoesNotExist:
        return {"error": "organization_not_found"}

    try:
        return reindex_organization(organization, scope=scope)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def index_tender_document_task(self, document_id: int) -> int:
    from tenders.models import Document

    from .services.indexing import index_tender_document

    try:
        document = Document.objects.select_related("tender").get(pk=document_id)
    except Document.DoesNotExist:
        return 0

    try:
        return index_tender_document(document)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def index_technical_offer_task(self, offer_id: int) -> int:
    from technical_offers.models import TechnicalOffer

    from .services.indexing import index_technical_offer

    try:
        offer = TechnicalOffer.objects.get(pk=offer_id)
    except TechnicalOffer.DoesNotExist:
        return 0

    try:
        return index_technical_offer(offer)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def index_requirement_task(self, requirement_id: int) -> int:
    from tenders.models import Requirement

    from .services.indexing import index_requirement

    try:
        requirement = Requirement.objects.select_related("tender", "document").get(
            pk=requirement_id
        )
    except Requirement.DoesNotExist:
        return 0

    try:
        return index_requirement(requirement)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def index_company_task(self, company_id: int) -> int:
    from companies.models import Company

    from .services.indexing import index_company

    try:
        company = Company.objects.get(pk=company_id)
    except Company.DoesNotExist:
        return 0

    try:
        return index_company(company)
    except Exception as exc:
        raise self.retry(exc=exc) from exc
