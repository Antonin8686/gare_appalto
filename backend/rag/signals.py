from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from companies.models import Company
from technical_offers.models import TechnicalOffer
from tenders.models import Document, Requirement

from .models import RagChunk
from .services.indexing import (
    delete_source_chunks,
    index_company,
    index_requirement,
    index_technical_offer,
    index_tender_document,
)


@receiver(post_save, sender=Document)
def index_document_on_save(sender, instance: Document, **kwargs):
    if instance.status != Document.Status.DONE or not instance.text_content.strip():
        delete_source_chunks(RagChunk.SourceType.TENDER_DOCUMENT, instance.id)
        return
    index_tender_document(instance)


@receiver(post_delete, sender=Document)
def remove_document_chunks(sender, instance: Document, **kwargs):
    delete_source_chunks(RagChunk.SourceType.TENDER_DOCUMENT, instance.id)


@receiver(post_save, sender=Requirement)
def index_requirement_on_save(sender, instance: Requirement, **kwargs):
    index_requirement(instance)


@receiver(post_delete, sender=Requirement)
def remove_requirement_chunks(sender, instance: Requirement, **kwargs):
    delete_source_chunks(RagChunk.SourceType.REQUIREMENT, instance.id)


@receiver(post_save, sender=TechnicalOffer)
def index_technical_offer_on_save(sender, instance: TechnicalOffer, **kwargs):
    index_technical_offer(instance)


@receiver(post_delete, sender=TechnicalOffer)
def remove_technical_offer_chunks(sender, instance: TechnicalOffer, **kwargs):
    delete_source_chunks(RagChunk.SourceType.TECHNICAL_OFFER, instance.id)


@receiver(post_save, sender=Company)
def index_company_on_save(sender, instance: Company, **kwargs):
    index_company(instance)


@receiver(post_delete, sender=Company)
def remove_company_chunks(sender, instance: Company, **kwargs):
    delete_source_chunks(RagChunk.SourceType.COMPANY, instance.id)
