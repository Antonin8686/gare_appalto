from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class RTI(models.Model):
    tender = models.ForeignKey(
        "tenders.Tender",
        on_delete=models.CASCADE,
        related_name="rti_groups",
        verbose_name="gara",
    )
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="rti_groups",
        verbose_name="organizzazione",
    )
    mandataria = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="rti_as_mandataria",
        verbose_name="impresa mandataria",
    )
    nome = models.CharField("denominazione RTI", max_length=255, blank=True)
    note = models.TextField("note", blank=True)
    ripartizione_requisiti = models.JSONField(
        "ripartizione requisiti",
        default=dict,
        blank=True,
        help_text='Mappa requirement_id → company_id responsabile',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "RTI"
        verbose_name_plural = "RTI"
        ordering = ["-updated_at"]

    def __str__(self):
        label = self.nome or f"RTI {self.mandataria.name}"
        return f"{label} – {self.tender.cig}"


class RTIMember(models.Model):
    class Ruolo(models.TextChoices):
        MANDATARIA = "mandataria", "Mandataria"
        MANDANTE = "mandante", "Mandante"

    rti = models.ForeignKey(
        RTI,
        on_delete=models.CASCADE,
        related_name="members",
        verbose_name="RTI",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="rti_memberships",
        verbose_name="impresa",
    )
    ruolo = models.CharField("ruolo", max_length=16, choices=Ruolo.choices)
    quota_partecipazione = models.DecimalField(
        "quota partecipazione %",
        max_digits=5,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    quota_esecuzione = models.DecimalField(
        "quota esecuzione %",
        max_digits=5,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    class Meta:
        verbose_name = "componente RTI"
        verbose_name_plural = "componenti RTI"
        constraints = [
            models.UniqueConstraint(
                fields=["rti", "company"],
                name="unique_rti_member_company",
            ),
        ]
        ordering = ["ruolo", "company__name"]

    def __str__(self):
        return f"{self.company.name} ({self.get_ruolo_display()})"


class Consorzio(models.Model):
    tender = models.ForeignKey(
        "tenders.Tender",
        on_delete=models.CASCADE,
        related_name="consorzi",
        verbose_name="gara",
    )
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="consorzi",
        verbose_name="organizzazione",
    )
    mandataria = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="consorzi_as_mandataria",
        verbose_name="impresa mandataria / capogruppo",
    )
    nome = models.CharField("denominazione consorzio", max_length=255, blank=True)
    note = models.TextField("note", blank=True)
    mandanti = models.JSONField(
        "mandanti",
        default=list,
        blank=True,
        help_text='[{"company_id": int, "quota_partecipazione": float, "quota_esecuzione": float}]',
    )
    ripartizione_requisiti = models.JSONField(
        "ripartizione requisiti",
        default=dict,
        blank=True,
        help_text='Mappa requirement_id → company_id responsabile',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "consorzio"
        verbose_name_plural = "consorzi"
        ordering = ["-updated_at"]

    def __str__(self):
        label = self.nome or f"Consorzio {self.mandataria.name}"
        return f"{label} – {self.tender.cig}"


class ImpresaAusiliaria(models.Model):
    tender = models.ForeignKey(
        "tenders.Tender",
        on_delete=models.CASCADE,
        related_name="imprese_ausiliarie",
        verbose_name="gara",
    )
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="imprese_ausiliarie",
        verbose_name="organizzazione",
    )
    impresa_principale = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="avvalimenti_ricevuti",
        verbose_name="impresa principale",
    )
    impresa_ausiliaria = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="avvalimenti_foriti",
        verbose_name="impresa ausiliaria",
    )
    requisiti_coperti = models.JSONField(
        "requisiti coperti",
        default=list,
        blank=True,
        help_text="Lista di requirement_id coperti tramite avvalimento",
    )
    note = models.TextField("note", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "impresa ausiliaria"
        verbose_name_plural = "imprese ausiliarie"
        constraints = [
            models.UniqueConstraint(
                fields=["tender", "impresa_principale", "impresa_ausiliaria"],
                name="unique_avvalimento_pair",
            ),
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return (
            f"Avvalimento {self.impresa_ausiliaria.name} → "
            f"{self.impresa_principale.name} ({self.tender.cig})"
        )
