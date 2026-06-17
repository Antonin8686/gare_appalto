from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import Organization, User
from companies.models import Company

DEFAULT_ORG = "Acme Srl"
DEFAULT_EMAIL = "test@example.com"
DEFAULT_PIVA = "12345678903"

DEV_COMPANY_DEFAULTS = {
    "name": "Edilizia Demo S.r.l.",
    "partita_iva": DEFAULT_PIVA,
    "codice_fiscale": DEFAULT_PIVA,
    "forma_giuridica": Company.FormaGiuridica.SRL,
    "oggetto_sociale": (
        "Costruzione, manutenzione e ristrutturazione di edifici civili e industriali; "
        "impianti elettrici e termoidraulici."
    ),
    "iscrizione_cciaa": {
        "rea": "RM-1234567",
        "provincia": "RM",
        "data_iscrizione": "2015-03-12",
    },
    "codici_ateco": [
        {"codice": "41.20", "descrizione": "Costruzione di edifici residenziali e non residenziali"},
        {"codice": "43.21", "descrizione": "Installazione di impianti elettrici"},
    ],
    "sedi_legali": [
        {
            "indirizzo": "Via Roma 42",
            "cap": "00100",
            "citta": "Roma",
            "provincia": "RM",
            "nazione": "Italia",
            "principale": True,
        }
    ],
    "sedi_operative": [
        {
            "indirizzo": "Via Tiburtina 1180",
            "cap": "00156",
            "citta": "Roma",
            "provincia": "RM",
            "nazione": "Italia",
            "principale": True,
        }
    ],
    "attestazioni_soa": [
        {"categoria": "OG1", "classifica": "III", "scadenza": (date.today() + timedelta(days=400)).isoformat()},
        {"categoria": "OS3", "classifica": "II", "scadenza": (date.today() + timedelta(days=400)).isoformat()},
    ],
    "certificazioni": [
        {"nome": "ISO 9001:2015", "ente": "IMQ", "scadenza": (date.today() + timedelta(days=300)).isoformat()},
        {"nome": "ISO 14001:2015", "ente": "IMQ", "scadenza": (date.today() + timedelta(days=300)).isoformat()},
    ],
    "polizze_assicurative": [
        {
            "tipo": "RC professionale",
            "compagnia": "Generali Italia",
            "massimale": "2000000",
            "scadenza": (date.today() + timedelta(days=180)).isoformat(),
        }
    ],
    "dipendenti": [
        {"categoria": "Operai", "numero": 24},
        {"categoria": "Impiegati", "numero": 8},
        {"categoria": "Quadri", "numero": 3},
    ],
    "fatturato": Decimal("4850000.00"),
    "ccnl": "Edilizia e Industrie affini",
    "esperienze": [
        {
            "titolo": "Manutenzione straordinaria scuole",
            "committente": "Comune di Roma",
            "importo": "850000",
            "anno": "2024",
        },
        {
            "titolo": "Riqualificazione energetica ambulatori",
            "committente": "ASL Roma 1",
            "importo": "1200000",
            "anno": "2023",
        },
    ],
    "servizi": ["Costruzioni", "Manutenzione", "Impiantistica"],
    "presenza_territoriale": [
        {"regione": "Lazio", "province": ["RM", "LT", "FR"], "note": "Sede operativa principale"},
    ],
}


EXTRA_DEV_COMPANIES = [
    {
        "name": "Impianti Beta S.r.l.",
        "partita_iva": "23456789012",
        "codice_fiscale": "23456789012",
        "forma_giuridica": Company.FormaGiuridica.SRL,
        "oggetto_sociale": "Installazione e manutenzione di impianti elettrici, termoidraulici e speciali.",
        "fatturato": Decimal("2100000.00"),
        "servizi": ["Impiantistica", "Manutenzione"],
    },
    {
        "name": "Servizi Gamma S.p.A.",
        "partita_iva": "34567890123",
        "codice_fiscale": "34567890123",
        "forma_giuridica": Company.FormaGiuridica.SPA,
        "oggetto_sociale": "Servizi di facility management, pulizia industriale e logistica cantiere.",
        "fatturato": Decimal("3200000.00"),
        "servizi": ["Facility", "Logistica cantiere"],
    },
]


class Command(BaseCommand):
    help = "Crea o aggiorna le aziende fittizie per test locali (RTI, consorzi, ecc.)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default=DEFAULT_EMAIL, help="Email utente proprietario")
        parser.add_argument("--organization", default=DEFAULT_ORG, help="Nome organizzazione")
        parser.add_argument("--piva", default=DEFAULT_PIVA, help="Partita IVA azienda demo")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        organization_name = options["organization"].strip() or DEFAULT_ORG
        piva = options["piva"].strip()

        user = User.objects.filter(email=email).first()
        if user and user.organization_id:
            organization = user.organization
        else:
            organization, _ = Organization.get_or_create_by_name(organization_name)
            if user:
                user.organization = organization
                user.save(update_fields=["organization"])

        if not user:
            self.stdout.write(
                self.style.WARNING(
                    f"Utente {email} non trovato. Esegui prima: python manage.py ensure_dev_user"
                )
            )
            owner = User.objects.filter(organization=organization).order_by("id").first()
            if not owner:
                raise SystemExit("Nessun utente disponibile per l'organizzazione.")
        else:
            owner = user

        demo_companies = [
            {**DEV_COMPANY_DEFAULTS, "partita_iva": piva},
            *EXTRA_DEV_COMPANIES,
        ]

        for payload in demo_companies:
            company_piva = payload["partita_iva"]
            company, created = Company.objects.update_or_create(
                organization=organization,
                partita_iva=company_piva,
                defaults={
                    **payload,
                    "owner": owner,
                },
            )
            action = "creata" if created else "aggiornata"
            self.stdout.write(
                self.style.SUCCESS(
                    f"Azienda demo {action}: {company.name} (id={company.id}, P.IVA {company.partita_iva}) "
                    f"— organizzazione: {organization.name}"
                )
            )
