from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class TechnicalOffer(models.Model):
    class Category(models.TextChoices):
        ORGANIZZAZIONE = "organizzazione", "Organizzazione servizio"
        METODOLOGIA = "metodologia", "Metodologia operativa"
        PERSONALE = "personale", "Personale e formazione"
        ATTREZZATURE = "attrezzature", "Attrezzature e mezzi"
        SICUREZZA = "sicurezza", "Sicurezza sul lavoro"
        AMBIENTE = "ambiente", "Tutela ambientale"
        QUALITA = "qualita", "Sistema qualità"
        ALTRO = "altro", "Altro"

    class Settore(models.TextChoices):
        PULIZIE = "pulizie", "Pulizie e sanificazione"
        VERDE = "verde", "Verde e parchi"
        MANUTENZIONE = "manutenzione", "Manutenzione edile"
        FACILITY = "facility", "Facility management"
        IT = "it", "ICT e software"
        CONSULENZA = "consulenza", "Consulenza professionale"
        TRASPORTI = "trasporti", "Trasporti e logistica"
        SANITA = "sanita", "Sanità e sociale"
        CULTURA = "cultura", "Cultura e eventi"
        ALTRO = "altro", "Altro"

    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="technical_offers",
        verbose_name="organizzazione",
        null=True,
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="technical_offers",
        verbose_name="proprietario",
    )
    title = models.CharField("titolo", max_length=255)
    category = models.CharField(
        "categoria",
        max_length=32,
        choices=Category.choices,
        default=Category.ALTRO,
    )
    settore = models.CharField(
        "settore",
        max_length=32,
        choices=Settore.choices,
        blank=True,
        default="",
    )
    tipologia_servizio = models.CharField("tipologia servizio", max_length=255, blank=True, default="")
    ente_appaltante = models.CharField("ente appaltante", max_length=255, blank=True, default="")
    valore_appalto = models.DecimalField(
        "valore appalto",
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    durata = models.CharField(
        "durata",
        max_length=100,
        blank=True,
        default="",
        help_text='Es. "24 mesi", "3 anni"',
    )
    anno = models.PositiveIntegerField(
        "anno",
        null=True,
        blank=True,
        validators=[MinValueValidator(1990), MaxValueValidator(2100)],
    )
    punteggio_ottenuto = models.DecimalField(
        "punteggio ottenuto",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    content = models.TextField("contenuto", blank=True, default="")
    tags = models.JSONField(
        "tag",
        default=list,
        blank=True,
        help_text="Lista di stringhe per la ricerca e il filtraggio",
    )
    parole_chiave = models.JSONField(
        "parole chiave",
        default=list,
        blank=True,
        help_text="Parole chiave per ricerca semantica e RAG",
    )
    riutilizzabilita = models.PositiveSmallIntegerField(
        "riutilizzabilità",
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Valutazione 1-5",
    )
    innovativita = models.PositiveSmallIntegerField(
        "innovatività",
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Valutazione 1-5",
    )
    rag_text = models.TextField(
        "testo indicizzazione RAG",
        blank=True,
        default="",
        help_text="Testo consolidato per embedding e retrieval",
    )
    rag_metadata = models.JSONField(
        "metadati RAG",
        default=dict,
        blank=True,
        help_text="Metadati strutturati per il modulo RAG",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "offerta tecnica"
        verbose_name_plural = "offerte tecniche"
        ordering = ["-updated_at", "title"]
        indexes = [
            models.Index(fields=["category", "settore"]),
            models.Index(fields=["anno"]),
            models.Index(fields=["ente_appaltante"]),
        ]

    def __str__(self):
        return self.title

    def refresh_rag_index(self) -> None:
        from .services.rag_index import build_rag_payload

        payload = build_rag_payload(self)
        self.rag_text = payload["text"]
        self.rag_metadata = payload["metadata"]

    def save(self, *args, **kwargs):
        self.refresh_rag_index()
        super().save(*args, **kwargs)
