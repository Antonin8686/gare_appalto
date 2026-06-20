from django.test import SimpleTestCase

from tenders.services.document_link_extraction import (
    extract_urls_from_html,
    extract_urls_from_text,
    filter_document_urls,
)


class DocumentLinkExtractionTests(SimpleTestCase):
    def test_extract_urls_from_disciplinare_text(self):
        text = """
        Documentazione disponibile su https://portale.example.it/gara/123
        Allegato PDF: https://portale.example.it/files/disciplinare.pdf
        """
        urls = filter_document_urls(extract_urls_from_text(text))
        self.assertIn("https://portale.example.it/gara/123", urls)
        self.assertIn("https://portale.example.it/files/disciplinare.pdf", urls)

    def test_extract_pdf_links_from_html(self):
        html = """
        <html><body>
          <a href="/docs/capitolato.pdf">Capitolato</a>
          <a href="https://external.it/allegato.docx">Allegato</a>
        </body></html>
        """
        urls = filter_document_urls(
            extract_urls_from_html(html, "https://portale.example.it/gara/")
        )
        self.assertIn("https://portale.example.it/docs/capitolato.pdf", urls)
        self.assertIn("https://external.it/allegato.docx", urls)
