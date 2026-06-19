from django.core.management.base import BaseCommand

from tenders.models import ImportBatch
from tenders.tasks import process_import_batch, process_import_batch_sync


class Command(BaseCommand):
    help = "Rielabora importazioni bloccate in stato 'processing'."

    def add_arguments(self, parser):
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Esegue in sincrono senza accodare su Celery.",
        )

    def handle(self, *args, **options):
        batches = ImportBatch.objects.filter(status=ImportBatch.Status.PROCESSING).order_by("uploaded_at")
        count = batches.count()
        if count == 0:
            self.stdout.write("Nessuna importazione in elaborazione.")
            return

        self.stdout.write(f"Rielaborazione di {count} importazioni...")
        for batch in batches:
            self.stdout.write(f"- batch {batch.id}: {batch.original_filename}")
            if options["sync"]:
                process_import_batch_sync(batch.id)
            else:
                process_import_batch.delay(batch.id)

        self.stdout.write(self.style.SUCCESS("Accodamento completato."))
