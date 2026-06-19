from django.test import SimpleTestCase

from technical_offers.services.import_service import (
    _build_offer_payloads,
    infer_category,
    split_text_into_sections,
    ImportDefaults,
)


class TechnicalOfferImportServiceTests(SimpleTestCase):
    def test_split_by_headings(self):
        text = """
        1. Organizzazione del servizio
        L'organizzazione prevede un responsabile dedicato e turni H24 con coordinamento
        centralizzato presso la sede operativa. Il personale di linea è suddiviso per zone
        funzionali con referenti territoriali e procedure di escalation documentate.

        2. Metodologia operativa
        La metodologia adottata prevede checklist giornaliere, audit mensili e reportistica
        condivisa con la stazione appaltante. Gli interventi straordinari sono gestiti con
        ticket tracciati e tempi di presa in carico certificati.
        """
        sections = split_text_into_sections(text)
        self.assertGreaterEqual(len(sections), 2)
        self.assertIn("organizzazione", sections[0][0].lower())

    def test_single_file_payload(self):
        text = (
            "Organizzazione del servizio con struttura dedicata, turni programmati e "
            "coordinamento continuo tra le squadre operative."
        )
        payloads = _build_offer_payloads(
            filename="organizzazione_pulizie_2024.pdf",
            text=text,
            defaults=ImportDefaults(split_mode="single"),
        )
        self.assertEqual(len(payloads), 1)
        self.assertEqual(payloads[0]["category"], "organizzazione")

    def test_infer_category_from_title(self):
        category = infer_category(
            text="",
            title="Metodologia operativa Comune",
            fallback="altro",
        )
        self.assertEqual(category, "metodologia")
