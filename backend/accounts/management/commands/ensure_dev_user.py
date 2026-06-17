from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from accounts.models import Organization, User
from accounts.rbac import Role

DEFAULT_EMAIL = "test@example.com"
DEFAULT_PASSWORD = "Test1234!"


class Command(BaseCommand):
    help = "Crea o aggiorna l'utente di sviluppo per il login locale."

    def add_arguments(self, parser):
        parser.add_argument("--email", default=DEFAULT_EMAIL)
        parser.add_argument("--password", default=DEFAULT_PASSWORD)
        parser.add_argument("--organization", default="Acme Srl")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("ensure_dev_user è disponibile solo con DEBUG=True (ambiente di sviluppo).")

        email = options["email"].strip().lower()
        password = options["password"]
        organization_name = options["organization"].strip() or "Acme Srl"

        organization, _ = Organization.get_or_create_by_name(organization_name)
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0],
                "first_name": "Mario",
                "last_name": "Rossi",
                "organization": organization,
            },
        )

        user.organization = organization
        user.role = Role.ADMINISTRATOR
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "creato" if created else "aggiornato"
        self.stdout.write(
            self.style.SUCCESS(
                f"Utente {action}: {email} / {password} (organizzazione: {organization.name})"
            )
        )
