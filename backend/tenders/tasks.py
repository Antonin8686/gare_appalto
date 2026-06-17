from celery import shared_task
from django.utils import timezone

from .models import Document, ImportBatch
from .services.import_parser import parse_import_file
from .services.extraction import (
    apply_formal_rules_to_tender,
    apply_metadata_to_tender,
    parse_formal_rules,
    parse_requirements,
    parse_tender_metadata,
    save_requirements_for_document,
)
from .services.criterion_extraction import (
    parse_evaluation_criteria,
    save_evaluation_criteria_for_document,
)
from .services.document_validation import DocumentValidationError, validate_tender_document
from .services.ocr import extract_text_from_storage_file


def _fail_document(document: Document, issues: list[str]) -> None:
    document.status = Document.Status.FAILED
    document.validation_issues = issues
    document.error_message = "\n".join(issues)
    document.save(update_fields=["status", "validation_issues", "error_message"])


def process_document_sync(document_id: int) -> None:
    try:
        document = Document.objects.select_related("tender").get(pk=document_id)
    except Document.DoesNotExist:
        return

    try:
        document.status = Document.Status.PROCESSING
        document.error_message = ""
        document.validation_issues = []
        document.save(update_fields=["status", "error_message", "validation_issues"])

        text_content = extract_text_from_storage_file(document.file)
        if not text_content.strip():
            raise ValueError(
                "Nessun testo estratto dal documento: il file potrebbe essere vuoto, "
                "scansionato senza OCR disponibile o illeggibile."
            )

        tender = document.tender
        metadata = parse_tender_metadata(text_content)
        document_name = document.name or document.original_filename

        validation_issues = validate_tender_document(
            tender=tender,
            text=text_content,
            metadata=metadata,
            document_name=document_name,
        )
        if validation_issues:
            raise DocumentValidationError(validation_issues)

        document.text_content = text_content
        document.status = Document.Status.DONE
        document.error_message = ""
        document.validation_issues = []
        document.save(update_fields=["text_content", "status", "error_message", "validation_issues"])

        apply_metadata_to_tender(tender, metadata)

        requirements = parse_requirements(text_content, document_name=document_name)
        save_requirements_for_document(tender, document, requirements)

        criteria = parse_evaluation_criteria(text_content, document_name=document_name)
        save_evaluation_criteria_for_document(tender, document, criteria)

        formal_rules = parse_formal_rules(text_content)
        apply_formal_rules_to_tender(tender, formal_rules)

        from .services.embeddings import index_document_chunks
        from .services.scoring import apply_scoring_to_tender

        index_document_chunks(document)

        tender.ai_extracted = True
        tender.extracted_at = timezone.now()
        tender.save(update_fields=["ai_extracted", "extracted_at", "updated_at"])

        apply_scoring_to_tender(tender)
    except DocumentValidationError as exc:
        _fail_document(document, exc.issues)
    except ValueError as exc:
        _fail_document(document, [str(exc)])
    except Exception as exc:
        _fail_document(document, [f"Elaborazione fallita: {exc}"])


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def process_document(self, document_id: int) -> None:
    try:
        process_document_sync(document_id)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            try:
                document = Document.objects.get(pk=document_id)
                if document.status == Document.Status.PROCESSING:
                    _fail_document(document, [f"Elaborazione fallita dopo vari tentativi: {exc}"])
            except Document.DoesNotExist:
                pass
            return
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def process_import_batch(self, batch_id: int) -> None:
    try:
        batch = ImportBatch.objects.select_related("owner", "organization").get(pk=batch_id)
    except ImportBatch.DoesNotExist:
        return

    from .models import Tender

    try:
        with batch.file.open("rb") as uploaded:
            content = uploaded.read()

        rows = parse_import_file(content, batch.original_filename)
        tenders = [
            Tender(
                owner=batch.owner,
                organization=batch.organization,
                cig=row.cig,
                cpv=row.cpv,
                importo=row.importo,
                scadenza=row.scadenza,
                stato=row.stato,
                oggetto=row.oggetto,
                source=batch.source,
                import_batch=batch,
            )
            for row in rows
        ]
        Tender.objects.bulk_create(tenders)

        created_tenders = Tender.objects.filter(import_batch=batch)
        from .services.scoring import apply_scoring_to_tender

        for tender in created_tenders:
            apply_scoring_to_tender(tender)

        batch.tenders_created = len(tenders)
        batch.status = ImportBatch.Status.DONE
        batch.error_message = ""
        batch.save(update_fields=["tenders_created", "status", "error_message"])
    except Exception as exc:
        batch.status = ImportBatch.Status.FAILED
        batch.error_message = str(exc)
        batch.save(update_fields=["status", "error_message"])
        raise self.retry(exc=exc)
