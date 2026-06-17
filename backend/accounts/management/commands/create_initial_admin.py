import os

from django.core.management.base import BaseCommand, CommandError

from accounts.models import Organization, User
from accounts.rbac import Role


class Command(BaseCommand):
    help = "Crea il primo amministratore di produzione (variabili ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ORG)."

    def handle(self, *args, **options):
        email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        password = os.getenv("ADMIN_PASSWORD", "")
        organization_name = os.getenv("ADMIN_ORG", "Organizzazione principale").strip()

        if not email or not password:
            raise CommandError("Imposta ADMIN_EMAIL e ADMIN_PASSWORD prima di eseguire il comando.")

        if len(password) < 12:
            raise CommandError("ADMIN_PASSWORD deve contenere almeno 12 caratteri.")

        organization, _ = Organization.get_or_create_by_name(organization_name)
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0],
                "first_name": "Admin",
                "last_name": "Sistema",
                "organization": organization,
            },
        )

        user.organization = organization
        user.role = Role.ADMINISTRATOR
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = "creato" if created else "aggiornato"
        self.stdout.write(self.style.SUCCESS(f"Amministratore {action}: {email} ({organization.name})"))
