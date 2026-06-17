import logging

from ..models import Document
from ..tasks import process_document, process_document_sync

logger = logging.getLogger(__name__)

# Elaborazione sincrona fino a 8 MB; oltre si usa Celery in background.
SYNC_PROCESSING_MAX_BYTES = 8 * 1024 * 1024


def process_document_now(document_id: int) -> None:
    process_document_sync(document_id)


def process_uploaded_document(document: Document) -> Document:
    if document.file_size <= SYNC_PROCESSING_MAX_BYTES:
        process_document_now(document.id)
    else:
        try:
            process_document.delay(document.id)
        except Exception:
            logger.warning(
                "Celery non disponibile: elaborazione documento %s in sincrono",
                document.id,
                exc_info=True,
            )
            process_document_now(document.id)
    document.refresh_from_db()
    return document


def ensure_documents_processed(tender) -> None:
    """Completa subito documenti rimasti in elaborazione o falliti senza dettagli."""
    pending_ids = set(
        tender.documents.filter(status=Document.Status.PROCESSING).values_list("id", flat=True)
    )
    pending_ids.update(
        tender.documents.filter(
            status=Document.Status.FAILED,
            error_message="",
            validation_issues=[],
        ).values_list("id", flat=True)
    )
    for document_id in pending_ids:
        process_document_now(document_id)
