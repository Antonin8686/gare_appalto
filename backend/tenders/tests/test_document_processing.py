from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from tenders.services import document_processing


class ProcessUploadedDocumentTests(SimpleTestCase):
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    @patch("tenders.services.document_processing.transaction.on_commit")
    @patch("tenders.services.document_processing.process_document")
    def test_enqueue_on_commit_without_blocking(self, process_document_mock, on_commit_mock):
        document = MagicMock(id=42, status="processing")

        def run_on_commit(callback):
            callback()

        on_commit_mock.side_effect = run_on_commit

        returned = document_processing.process_uploaded_document(document)

        self.assertIs(returned, document)
        process_document_mock.delay.assert_called_once_with(42)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    @patch("tenders.services.document_processing.process_document_now")
    @patch("tenders.services.document_processing.process_document")
    def test_falls_back_to_sync_when_celery_unavailable(
        self,
        process_document_mock,
        process_document_now_mock,
    ):
        process_document_mock.delay.side_effect = RuntimeError("broker down")
        document = MagicMock(id=7)

        document_processing._enqueue_document_processing(7)

        process_document_now_mock.assert_called_once_with(7)
