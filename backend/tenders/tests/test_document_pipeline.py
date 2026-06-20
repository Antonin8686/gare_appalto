from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from tenders.models import Document, Tender
from tenders.services.document_types import infer_doc_type, is_modulo_doc, is_supplementary_doc
from tenders.services.document_validation import validate_tender_document
from tenders.services.extraction import apply_metadata_to_tender, extract_importo
from tenders.services.missing_documents import build_document_checklist


class DocumentTypeTests(SimpleTestCase):
    def test_modello_offerta_tecnica_is_modulo(self):
        doc_type = infer_doc_type("Modello 3 - Offerta tecnica.docx")
        self.assertEqual(doc_type, Document.DocType.MODULO)
        self.assertTrue(is_modulo_doc(doc_type, "Modello 3 - Offerta tecnica"))

    def test_disciplinare_stays_disciplinare(self):
        self.assertEqual(
            infer_doc_type("Disciplinare_di_gara.pdf"),
            Document.DocType.DISCIPLINARE,
        )


class ModuloValidationTests(SimpleTestCase):
    def _tender(self, **overrides):
        defaults = {
            "cig": "BC176F51C0",
            "cpv": "00000000",
            "importo": Decimal("729996.57"),
            "oggetto": "Servizi di pulizia del teatro sociale",
            "source": Tender.Source.TELEMAT,
        }
        defaults.update(overrides)
        return type("TenderStub", (), defaults)()

    def test_modello_offerta_tecnica_accepted_without_cig(self):
        tender = self._tender()
        text = (
            "Modello 3 - Offerta tecnica\n"
            "Il concorrente descrive l'organizzazione del servizio e la metodologia operativa. "
            "Compilare tutte le sezioni in formato A4 con carattere Arial 11.\n"
        ) * 3

        issues = validate_tender_document(
            tender=tender,
            text=text,
            metadata={},
            document_name="Modello 3 - Offerta tecnica.docx",
            doc_type=Document.DocType.MODULO,
        )

        self.assertEqual(issues, [])
        self.assertTrue(
            is_supplementary_doc(Document.DocType.MODULO, "Modello 3 - Offerta tecnica.docx")
        )


class ImportoExtractionTests(SimpleTestCase):
    def test_importo_base_asta(self):
        text = "L'importo a base d'asta pari a euro 224.524,40 è indicato nel bando."
        self.assertEqual(extract_importo(text), Decimal("224524.40"))

    def test_importo_base_di_gara(self):
        text = "Importo base di gara: € 75.000,00"
        self.assertEqual(extract_importo(text), Decimal("75000.00"))


class ApplyMetadataPriorityTests(SimpleTestCase):
    def test_disciplinare_overwrites_telemat_importo(self):
        tender = MagicMock()
        tender.cig = "1234567890"
        tender.cpv = "00000000"
        tender.importo = Decimal("0")
        tender.scadenza = None
        tender.source = Tender.Source.TELEMAT

        apply_metadata_to_tender(
            tender,
            {"importo": Decimal("224524.40"), "cig": "BC176F51C0", "cpv": "90919293"},
            source_doc_type=Document.DocType.DISCIPLINARE,
            source_document_name="Disciplinare.pdf",
        )

        self.assertEqual(tender.importo, Decimal("224524.40"))
        self.assertEqual(tender.cig, "BC176F51C0")
        self.assertEqual(tender.cpv, "90919293")
        tender.save.assert_called_once()


class MissingDocumentsTests(SimpleTestCase):
    def test_checklist_marks_missing_formal_rules(self):
        tender = MagicMock()
        tender.formal_rules = {
            "allegati": [
                {"label": "Domanda di partecipazione"},
                {"label": "Offerta economica"},
            ]
        }
        tender.documents.exclude.return_value.order_by.return_value = []

        result = build_document_checklist(tender)

        missing_labels = {item["label"] for item in result["missing"]}
        self.assertIn("Disciplinare di gara", missing_labels)
        self.assertIn("Domanda di partecipazione", missing_labels)
        self.assertFalse(result["has_disciplinare"])

    def test_checklist_marks_matched_upload(self):
        from types import SimpleNamespace

        tender = MagicMock()
        tender.formal_rules = {"allegati": [{"label": "Domanda di partecipazione"}]}
        document = SimpleNamespace(
            name="Modello A domanda",
            original_filename="Modello_A_domanda.pdf",
            doc_type=Document.DocType.MODULO,
            status=Document.Status.DONE,
        )
        tender.documents.exclude.return_value.order_by.return_value = [document]

        result = build_document_checklist(tender)

        self.assertGreaterEqual(result["matched_count"], 1)
        self.assertTrue(any(item["label"] == "Domanda di partecipazione" for item in result["matched"]))
