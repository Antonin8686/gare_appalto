import io
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase

from tenders.services.import_parser import parse_import_file
from tenders.services.pdf_import_parser import extract_rows_from_pdf_text


class ImportParserCsvTests(SimpleTestCase):
    def test_parse_csv_file(self):
        content = (
            "CIG,CPV,Importo,Scadenza,Stato,Oggetto\n"
            "A1B2C3D4E5,12345678,100000.50,31/12/2026,aperta,Servizio pulizie\n"
        ).encode("utf-8-sig")

        rows = parse_import_file(content, "report.csv")

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].cig, "A1B2C3D4E5")
        self.assertEqual(rows[0].cpv, "12345678")
        self.assertEqual(rows[0].importo, Decimal("100000.50"))
        self.assertEqual(rows[0].scadenza, date(2026, 12, 31))
        self.assertEqual(rows[0].stato, "aperta")
        self.assertEqual(rows[0].oggetto, "Servizio pulizie")


class ImportParserXlsxTests(SimpleTestCase):
    def test_parse_xlsx_file(self):
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["CIG", "CPV", "Importo", "Scadenza", "Stato", "Oggetto"])
        sheet.append(["Z9Y8X7W6V5", "87654321", "250000", "15/06/2026", "aperta", "Manutenzione verde"])

        buffer = io.BytesIO()
        workbook.save(buffer)

        rows = parse_import_file(buffer.getvalue(), "report.xlsx")

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].cig, "Z9Y8X7W6V5")
        self.assertEqual(rows[0].importo, Decimal("250000"))


class PdfImportParserTests(SimpleTestCase):
    def test_extract_rows_via_cig_scan_fallback(self):
        text = """
        Gara A1B2C3D4E5 CPV 12345678 importo € 75.000,00 scadenza 20/03/2026
        Fornitura materiali edili
        """

        with patch(
            "tenders.services.ocr.extract_text_from_bytes",
            return_value=text,
        ):
            rows = parse_import_file(b"%PDF-1.4 mock", "report.pdf")

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].cig, "A1B2C3D4E5")
        self.assertEqual(rows[0].cpv, "12345678")
