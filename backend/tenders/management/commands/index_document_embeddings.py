from django.core.management.base import BaseCommand

from tenders.models import Document
from tenders.services.embeddings import index_document_embedding


class Command(BaseCommand):
    help = "Genera gli embedding vettoriali per i documenti già elaborati."

    def handle(self, *args, **options):
        documents = Document.objects.filter(
            status=Document.Status.DONE,
        ).exclude(text_content="")

        total = documents.count()
        if total == 0:
            self.stdout.write("Nessun documento da indicizzare.")
            return

        indexed = 0
        for document in documents.iterator():
            index_document_embedding(document)
            indexed += 1
            self.stdout.write(f"Indicizzato {indexed}/{total}: {document.name}")

        self.stdout.write(self.style.SUCCESS(f"Completato: {indexed} documenti indicizzati."))
