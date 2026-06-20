import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from ..models import Document
from ..tasks import process_document, process_document_sync

logger = logging.getLogger(__name__)

STALE_PROCESSING_AFTER = timedelta(minutes=2)


def process_document_now(document_id: int) -> None:
    process_document_sync(document_id)


def _enqueue_document_processing(document_id: int) -> None:
    try:
        process_document.delay(document_id)
    except Exception:
        logger.warning(
            "Celery non disponibile: elaborazione documento %s in sincrono",
            document_id,
            exc_info=True,
        )
        process_document_now(document_id)


def process_uploaded_document(document: Document) -> Document:
    """Salva il documento e avvia l'elaborazione in background (non blocca la risposta HTTP)."""
    transaction.on_commit(lambda: _enqueue_document_processing(document.id))
    return document


def ensure_documents_processed(tender) -> None:
    """Riaccoda documenti bloccati o in stato inconsistente."""
    stale_before = timezone.now() - STALE_PROCESSING_AFTER
    pending_ids = set(
        tender.documents.filter(
            status=Document.Status.PROCESSING,
            uploaded_at__lt=stale_before,
        ).values_list("id", flat=True)
    )
    pending_ids.update(
        tender.documents.filter(
            status=Document.Status.FAILED,
            error_message="",
            validation_issues=[],
        ).values_list("id", flat=True)
    )
    for document_id in pending_ids:
        _enqueue_document_processing(document_id)
