from django.conf import settings

from django.db import models





class Company(models.Model):

    class FormaGiuridica(models.TextChoices):

        SRL = "srl", "S.r.l."

        SPA = "spa", "S.p.A."

        SNC = "snc", "S.n.c."

        SAS = "sas", "S.a.s."

        COOPERATIVA = "cooperativa", "Cooperativa"

        DITTA_INDIVIDUALE = "ditta_individuale", "Ditta individuale"

        CONSORZIO = "consorzio", "Consorzio"

        ALTRO = "altro", "Altro"



    organization = models.ForeignKey(

        "accounts.Organization",

        on_delete=models.CASCADE,

        related_name="companies",

        verbose_name="organizzazione",

        null=True,

        blank=True,

    )

    owner = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.CASCADE,

        related_name="companies",

        verbose_name="proprietario",

    )

    name = models.CharField("ragione sociale", max_length=255)

    partita_iva = models.CharField("partita IVA", max_length=11, blank=True, default="")

    codice_fiscale = models.CharField("codice fiscale", max_length=16, blank=True, default="")

    forma_giuridica = models.CharField(

        "forma giuridica",

        max_length=32,

        choices=FormaGiuridica.choices,

        blank=True,

        default="",

    )

    iscrizione_cciaa = models.JSONField(

        "iscrizione CCIAA",

        default=dict,

        blank=True,

        help_text='{"rea": str, "provincia": str, "data_iscrizione": str|null}',

    )

    codici_ateco = models.JSONField(

        "codici ATECO",

        default=list,

        blank=True,

        help_text='Lista di {"codice": str, "descrizione": str}',

    )

    oggetto_sociale = models.TextField("oggetto sociale", blank=True, default="")

    sedi_legali = models.JSONField(

        "sedi legali",

        default=list,

        blank=True,

        help_text='Lista di {"indirizzo", "cap", "citta", "provincia", "nazione", "principale"}',

    )

    sedi_operative = models.JSONField(

        "sedi operative",

        default=list,

        blank=True,

        help_text="Stessa struttura delle sedi legali",

    )

    autorizzazioni = models.JSONField(

        "autorizzazioni",

        default=list,

        blank=True,

        help_text='Lista di {"nome", "ente", "numero", "scadenza"}',

    )

    licenze = models.JSONField(

        "licenze",

        default=list,

        blank=True,

        help_text='Lista di {"nome", "ente", "numero", "scadenza"}',

    )

    rating_legalita = models.JSONField(

        "rating di legalità",

        default=dict,

        blank=True,

        help_text='{"stelle": int, "ente": str, "scadenza": str|null}',

    )

    attestazioni_soa = models.JSONField(

        "attestazioni SOA",

        default=list,

        blank=True,

        help_text='Lista di {"categoria", "classifica", "scadenza"}',

    )

    referenze_bancarie = models.JSONField(

        "referenze bancarie",

        default=list,

        blank=True,

        help_text='Lista di {"istituto", "filiale", "iban", "note"}',

    )

    polizze_assicurative = models.JSONField(

        "polizze assicurative",

        default=list,

        blank=True,

        help_text='Lista di {"tipo", "compagnia", "massimale", "scadenza"}',

    )

    presenza_territoriale = models.JSONField(

        "presenza territoriale",

        default=list,

        blank=True,

        help_text='Lista di {"regione", "province": [str], "note"}',

    )

    fatturato = models.DecimalField(

        "fatturato annuo",

        max_digits=14,

        decimal_places=2,

        null=True,

        blank=True,

    )

    ccnl = models.CharField("CCNL applicato", max_length=255, blank=True, default="")

    dipendenti = models.JSONField(

        "dipendenti",

        default=list,

        blank=True,

        help_text='Lista di {"categoria": str, "numero": int}',

    )

    esperienze = models.JSONField(

        "esperienze",

        default=list,

        blank=True,

        help_text="Esperienze pregresse su appalti simili",

    )

    certificazioni = models.JSONField("certificazioni", default=list, blank=True)

    servizi = models.JSONField("servizi", default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)



    class Meta:

        verbose_name = "azienda"

        verbose_name_plural = "aziende"

        ordering = ["name"]

        constraints = [

            models.UniqueConstraint(

                fields=["organization", "partita_iva"],

                condition=models.Q(partita_iva__gt=""),

                name="unique_partita_iva_per_organization",

            ),

        ]



    def __str__(self):
        return self.name


import os
import uuid


def company_document_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"companies/{instance.company_id}/documents/{uuid.uuid4().hex}{ext}"


class CompanyDocument(models.Model):
    class Categoria(models.TextChoices):
        DURC = "durc", "DURC"
        VISURA_CAMERALE = "visura_camerale", "Visura Camerale"
        CERTIFICAZIONE_ISO = "certificazione_iso", "Certificazione ISO"
        BILANCIO = "bilancio", "Bilancio"
        POLIZZA = "polizza", "Polizza"
        DICHIARAZIONE = "dichiarazione", "Dichiarazione"
        PERSONALIZZATO = "personalizzato", "Documento Personalizzato"

    class StatoValidita(models.TextChoices):
        VALIDO = "valido", "Valido"
        IN_SCADENZA = "in_scadenza", "In scadenza"
        SCADUTO = "scaduto", "Scaduto"
        SENZA_SCADENZA = "senza_scadenza", "Senza scadenza"

    ALLOWED_EXTENSIONS = {
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
    }

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="azienda",
    )
    categoria = models.CharField(
        "categoria",
        max_length=32,
        choices=Categoria.choices,
        default=Categoria.PERSONALIZZATO,
    )
    file = models.FileField("file", upload_to=company_document_path)
    original_filename = models.CharField("nome file originale", max_length=255)
    content_type = models.CharField("tipo MIME", max_length=128, blank=True)
    file_size = models.PositiveIntegerField("dimensione (byte)", default=0)
    data_rilascio = models.DateField("data rilascio", null=True, blank=True)
    data_scadenza = models.DateField("data scadenza", null=True, blank=True)
    note = models.TextField("note", blank=True)
    stato_validita = models.CharField(
        "stato validità",
        max_length=20,
        choices=StatoValidita.choices,
        default=StatoValidita.SENZA_SCADENZA,
    )
    uploaded_at = models.DateTimeField("caricato il", auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "documento aziendale"
        verbose_name_plural = "documenti aziendali"
        ordering = ["data_scadenza", "-uploaded_at"]

    def __str__(self):
        return f"{self.company.name} – {self.get_categoria_display()}"

    def delete(self, *args, **kwargs):
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)

    def refresh_stato_validita(self, *, save: bool = True) -> str:
        from .services.document_validity import compute_stato_validita

        self.stato_validita = compute_stato_validita(self.data_scadenza)
        if save:
            self.save(update_fields=["stato_validita", "updated_at"])
        return self.stato_validita

    def save(self, *args, **kwargs):
        from .services.document_validity import compute_stato_validita

        self.stato_validita = compute_stato_validita(self.data_scadenza)
        super().save(*args, **kwargs)

