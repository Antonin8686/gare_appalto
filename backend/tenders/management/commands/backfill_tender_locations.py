from django.core.management.base import BaseCommand

from tenders.models import Tender
from tenders.services.italian_regions import resolve_regione_provincia


class Command(BaseCommand):
    help = "Compila provincia e regione per gare esistenti a partire dai dati disponibili."

    def handle(self, *args, **options):
        updated = 0
        for tender in Tender.objects.all().iterator():
            provincia, regione = resolve_regione_provincia(
                provincia=tender.provincia,
                regione=tender.regione,
                stazione_appaltante=tender.stazione_appaltante,
                zona=tender.zona,
                oggetto=tender.oggetto,
            )
            fields_to_update: list[str] = []
            if provincia and tender.provincia != provincia:
                tender.provincia = provincia
                fields_to_update.append("provincia")
            if regione and tender.regione != regione:
                tender.regione = regione
                fields_to_update.append("regione")
            if fields_to_update:
                tender.save(update_fields=fields_to_update)
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Aggiornate {updated} gare."))
