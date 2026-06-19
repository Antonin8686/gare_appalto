from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase

from tenders.models import Document, Tender
from tenders.services.document_validation import validate_tender_document
from tenders.services.document_types import infer_doc_type


class InferDocTypeTests(SimpleTestCase):
    def test_disciplinare_from_filename(self):
        self.assertEqual(
            infer_doc_type("Disciplinare_15062026_signed.pdf"),
            Document.DocType.DISCIPLINARE,
        )

    def test_allegato_from_filename(self):
        self.assertEqual(infer_doc_type("Allegato_1.pdf"), Document.DocType.ALLEGATO)


class DocumentValidationTests(SimpleTestCase):
    def _tender(self, **overrides):
        defaults = {
            "cig": "15290728",
            "cpv": "00000000",
            "importo": Decimal("729996.57"),
            "oggetto": "Servizi di pulizia del teatro sociale",
            "source": Tender.Source.TELEMAT,
        }
        defaults.update(overrides)
        return type("TenderStub", (), defaults)()

    def test_disciplinare_accepts_real_cig_over_telemat_rif(self):
        tender = self._tender()
        metadata = {"cig": "BC0AB32B78", "importo": Decimal("224524.40")}
        text = (
            "DISCIPLINARE DI GARA\nCIG BC0AB32B78\n"
            "Servizi di pulizia del teatro sociale\n"
            "requisito obbligatorio: possesso certificazione\n"
        )

        with patch(
            "tenders.services.document_validation.parse_requirements",
            return_value=[object()],
        ), patch(
            "tenders.services.document_validation.parse_evaluation_criteria",
            return_value=[],
        ):
            issues = validate_tender_document(
                tender=tender,
                text=text,
                metadata=metadata,
                document_name="Disciplinare_15062026_signed.pdf",
                doc_type=Document.DocType.DISCIPLINARE,
            )

        self.assertEqual(issues, [])

    def test_non_disciplinare_still_checks_cig_mismatch(self):
        tender = self._tender(cig="A1B2C3D4E5", source=Tender.Source.MANUAL)
        metadata = {"cig": "BC0AB32B78"}
        text = (
            "Capitolato tecnico CIG BC0AB32B78 appalto servizio fornitura procedura "
            "requisito obbligatorio: possesso certificazione"
        )

        issues = validate_tender_document(
            tender=tender,
            text=text,
            metadata=metadata,
            document_name="Capitolato.pdf",
            doc_type=Document.DocType.CAPITOLATO,
        )

        self.assertTrue(any("CIG nel documento" in issue for issue in issues))

    def test_allegato_skips_tender_keyword_checks(self):
        tender = self._tender()
        metadata = {"importo": Decimal("70.20")}
        text = (
            "Cooperativa Sociale\nRendiconto corrispettivi Bar\n"
            "Gennaio 2 € 70,20 € 35,10\n" * 8
        )

        issues = validate_tender_document(
            tender=tender,
            text=text,
            metadata=metadata,
            document_name="Allegato_1.pdf",
            doc_type=Document.DocType.ALLEGATO,
        )

        self.assertEqual(issues, [])


class CriterionExtractionTests(SimpleTestCase):
    def test_address_line_is_not_parsed_as_evaluation_grid_row(self):
        from tenders.services.criterion_extraction import parse_evaluation_criteria

        text = """
        Griglia di valutazione
        legale: Via Italo Barbieri nr. 20 – 25080 Padenghe sul Garda (BS) – Telefono 030 9995409
        Organizzazione del servizio 20 10
        """

        criteria = parse_evaluation_criteria(text, document_name="disciplinare.pdf")
        titles = [item["titolo"].lower() for item in criteria]

        self.assertFalse(any("telefono" in title or "barbieri" in title for title in titles))
        self.assertTrue(any("organizzazione" in title for title in titles))

    def test_toc_lines_are_not_parsed_as_criteria(self):
        from tenders.services.criterion_extraction import parse_evaluation_criteria

        text = """
        CRITERI DI VALUTAZIONE DELL'OFFERTA TECNICA .............................................. 38
        OFFERTA TECNICA ............................................................................... 34
        OFFERTA ECONOMICA ............................................................................. 36
        CRITERIO DI AGGIUDICAZIONE .................................................................... 38
        """

        criteria = parse_evaluation_criteria(text, document_name="disciplinare.pdf")
        self.assertEqual(criteria, [])


class DisciplinareCriterionExtractionTests(SimpleTestCase):
    def test_parse_section_18_allocation_scores(self):
        from tenders.services.criterion_extraction import parse_evaluation_criteria

        text = """
        18. CRITERIO DI AGGIUDICAZIONE
        L'appalto è aggiudicato in base al criterio dell'offerta economicamente più
        vantaggiosa individuata sulla base del miglior rapporto qualità/prezzo.
        La valutazione dell'offerta tecnica e dell'offerta economica è effettuata in base ai
        seguenti punteggi.
         PUNTEGGIO MASSIMO
        Offerta tecnica 80
        Offerta economica 20
        TOTALE 100

        18.1. CRITERI DI VALUTAZIONE DELL'OFFERTA TECNICA
        Il punteggio dell'offerta tecnica è attribuito sulla base dei criteri di valutazione
        elencati nella tabella contenuta nell'allegato al presente disciplinare "Criteri di
        valutazione delle offerte tecniche".
        Il concorrente è escluso dalla gara nel caso in cui consegua un punteggio inferiore alla
        soglia minima di sbarramento pari a 45 punti.

        18.2. METODO DI ATTRIBUZIONE DEL COEFFICIENTE
        """

        criteria = parse_evaluation_criteria(text, document_name="disciplinare.pdf")
        titles = {item["titolo"] for item in criteria}
        scores = {item["titolo"]: item.get("punteggio_massimo") for item in criteria}

        self.assertEqual(len(criteria), 2)
        self.assertIn("Offerta tecnica", titles)
        self.assertIn("Offerta economica", titles)
        self.assertEqual(str(scores["Offerta tecnica"]), "80.00")
        self.assertEqual(str(scores["Offerta economica"]), "20.00")
        self.assertTrue(any(item.get("soglia_minima") == "45 punti" for item in criteria))
        self.assertTrue(
            any("Criteri di valutazione delle offerte tecniche" in (item.get("descrizione") or "") for item in criteria)
        )

    def test_inline_griglia_rows_become_subcriteria(self):
        from tenders.services.criterion_extraction import parse_evaluation_criteria

        text = """
        18. CRITERIO DI AGGIUDICAZIONE
        L'appalto è aggiudicato in base al criterio dell'offerta economicamente più
        vantaggiosa individuata sulla base del miglior rapporto qualità/prezzo.
         PUNTEGGIO MASSIMO
        Offerta tecnica 70
        Offerta economica 30
        TOTALE 100

        18.1. CRITERI DI VALUTAZIONE DELL'OFFERTA TECNICA
        Organizzazione del servizio 20 D
        Metodologia operativa 15 T

        18.2. METODO DI ATTRIBUZIONE
        """

        criteria = parse_evaluation_criteria(text, document_name="disciplinare.pdf")
        titles = [item["titolo"] for item in criteria]

        self.assertIn("Organizzazione del servizio", titles)
        self.assertIn("Metodologia operativa", titles)
        organizzazione = next(item for item in criteria if item["titolo"] == "Organizzazione del servizio")
        self.assertEqual(organizzazione["livello"], "subcriterio")
        self.assertEqual(str(organizzazione["punteggio_discrezionale"]), "20.00")


class FormalRulesExtractionTests(SimpleTestCase):
    def test_parse_disciplinare_formal_rules(self):
        from tenders.services.formal_rules_extraction import parse_formal_rules_from_document

        text = """
        La documentazione di gara comprende:
        a) bando di gara
        b) disciplinare di gara;
        c) criteri di valutazione delle offerte tecniche;
        d) modello A - Domanda di partecipazione;
        e) modello B – Offerta economica;

        La relazione tecnica, redatta in formato A4 - interlinea 1,5 - con carattere
        preferibilmente Arial 10, non potrà essere composta da un numero di facciate
        superiore a 15 (quindici). Le pagine eccedenti tale limite non saranno prese in
        considerazione. Sono esclusi dal conteggio delle pagine:
        - l'indice e le eventuali copertine;
        """

        rules = parse_formal_rules_from_document(text)
        categories = {rule["category"] for rule in rules}
        labels = [rule["label"].lower() for rule in rules]

        self.assertIn("pagine", categories)
        self.assertIn("font", categories)
        self.assertIn("allegati", categories)
        self.assertTrue(any("15" in label for label in labels))
        self.assertTrue(any("arial" in label for label in labels))
        self.assertTrue(any("domanda di partecipazione" in label for label in labels))


class DisciplinareRequirementsExtractionTests(SimpleTestCase):
    def test_parse_section_6_requirements(self):
        from tenders.services.extraction import parse_requirements

        text = """
        6.1. REQUISITI DI IDONEITÀ PROFESSIONALE
        a) Iscrizione nel Registro delle Imprese oppure nell'Albo delle Imprese artigiane
        per attività pertinenti con quelle oggetto della presente procedura di gara.
        b) Iscrizione nell'albo delle imprese che svolgono attività di custodia.

        6.2. REQUISITI DI CAPACITÀ ECONOMICA E FINANZIARIA
        Non sono richiesti requisiti di capacità economica e finanziaria.

        6.3. REQUISITI DI CAPACITÀ TECNICA E PROFESSIONALE
        a) Esecuzione negli ultimi dieci anni di servizi analoghi di pulizia per un importo
        complessivo non inferiore ad € 200.000,00, oltre IVA.
        b) Esecuzione negli ultimi dieci anni di servizi analoghi di custodia per un importo
        complessivo non inferiore ad € 100.000,00, oltre IVA.
        """

        requirements = parse_requirements(text, document_name="disciplinare.pdf")
        descriptions = [item["descrizione"].lower() for item in requirements]
        categories = {item["categoria"] for item in requirements}

        self.assertGreaterEqual(len(requirements), 4)
        self.assertIn("idoneita_professionale", categories)
        self.assertIn("tecnico_professionale", categories)
        self.assertTrue(any("iscrizione" in desc for desc in descriptions))
        self.assertTrue(any("200.000" in desc or "200000" in desc for desc in descriptions))
        self.assertTrue(any("non sono richiesti" in desc for desc in descriptions))


class EconomicOfferExtractionTests(SimpleTestCase):
    def test_detect_ribasso_pricing_model(self):
        from tenders.services.economic_offer_extraction import parse_economic_structure_from_text

        text = """
        Criterio di aggiudicazione: offerta economicamente più vantaggiosa
        sul ribasso percentuale unico.
        Importo a base di gara: € 224.524,40
        """
        structure = parse_economic_structure_from_text(text, importo_fallback="224524.40")
        self.assertEqual(structure["pricing_model"], "ribasso_percentuale")
        self.assertTrue(structure["line_items"])

    def test_build_technical_section_template(self):
        from tenders.services.offer_auto_generation import _build_technical_section_content

        content = _build_technical_section_content(
            title="Organizzazione del servizio",
            category="organizzazione",
            criterion=None,
            tender=type("T", (), {"oggetto": "Servizi di pulizia"})(),
        )
        self.assertIn("Organizzazione del servizio", content)
        self.assertIn("Servizi di pulizia", content)
