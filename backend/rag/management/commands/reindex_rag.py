from django.core.management.base import BaseCommand

from accounts.models import Organization
from rag.services.indexing import reindex_organization


class Command(BaseCommand):
    help = "Reindicizza tutte le sorgenti RAG (documenti, OT, requisiti, aziende)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--organization-id",
            type=int,
            help="ID organizzazione da indicizzare (default: tutte)",
        )
        parser.add_argument(
            "--scope",
            choices=["all", "tender_documents", "technical_offers", "requirements", "companies"],
            default="all",
            help="Ambito di reindicizzazione",
        )

    def handle(self, *args, **options):
        organization_id = options.get("organization_id")
        scope = options["scope"]

        if organization_id:
            organizations = Organization.objects.filter(pk=organization_id)
        else:
            organizations = Organization.objects.all()

        if not organizations.exists():
            self.stderr.write(self.style.ERROR("Nessuna organizzazione trovata."))
            return

        for organization in organizations:
            self.stdout.write(f"Reindicizzazione {organization.name} (scope={scope})...")
            counts = reindex_organization(organization, scope=scope)
            self.stdout.write(self.style.SUCCESS(f"  Completato: {counts}"))
