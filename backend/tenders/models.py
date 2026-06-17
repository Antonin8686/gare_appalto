import os
import uuid

from django.conf import settings
from django.db import models
from pgvector.django import HnswIndex, VectorField

from .constants import EMBEDDING_DIMENSIONS


def tender_document_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"tenders/{instance.tender_id}/{uuid.uuid4().hex}{ext}"


def default_formal_rules():
    return {
        "pagine": [],
        "font": [],
        "margini": [],
        "allegati": [],
    }


def import_batch_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"imports/{instance.source}/{uuid.uuid4().hex}{ext}"


class ImportBatch(models.Model):
    class Source(models.TextChoices):
        SCOUTING = "scouting", "Scouting"
        TELEMAT = "telemat", "Telemat"

    class Status(models.TextChoices):
        PROCESSING = "processing", "In elaborazione"
        DONE = "done", "Completato"
        FAILED = "failed", "Errore"

    ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}

    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="import_batches",
        verbose_name="organizzazione",
        null=True,
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="import_batches",
        verbose_name="proprietario",
    )
    source = models.CharField("fonte", max_length=20, choices=Source.choices)
    file = models.FileField("file", upload_to=import_batch_path)
    original_filename = models.CharField("nome file originale", max_length=255)
    content_type = models.CharField("tipo MIME", max_length=128, blank=True)
    file_size = models.PositiveIntegerField("dimensione (byte)", default=0)
    status = models.CharField(
        "stato elaborazione",
        max_length=20,
        choices=Status.choices,
        default=Status.PROCESSING,
    )
    tenders_created = models.PositiveIntegerField("gare create", default=0)
    error_message = models.TextField("messaggio errore", blank=True)
    uploaded_at = models.DateTimeField("caricato il", auto_now_add=True)

    class Meta:
        verbose_name = "importazione"
        verbose_name_plural = "importazioni"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.get_source_display()} – {self.original_filename}"

    def delete(self, *args, **kwargs):
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)


class Tender(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manuale"
        SCOUTING = "scouting", "Scouting"
        TELEMAT = "telemat", "Telemat"

    class Stato(models.TextChoices):
        BOZZA = "bozza", "Bozza"
        APERTA = "aperta", "Aperta"
        CHIUSA = "chiusa", "Chiusa"
        AGGIUDICATA = "aggiudicata", "Aggiudicata"

    class Priorita(models.TextChoices):
        ALTA = "alta", "Alta"
        MEDIA = "media", "Media"
        BASSA = "bassa", "Bassa"

    class Fase(models.TextChoices):
        DA_ANALIZZARE = "da_analizzare", "Da analizzare"
        IN_CORSO = "in_corso", "In corso"
        PARTECIPABILE = "partecipabile", "Partecipabile"
        ESCLUSA = "esclusa", "Esclusa"
        OFFERTA = "offerta", "Offerta"

    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="tenders",
        verbose_name="organizzazione",
        null=True,
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenders",
        verbose_name="proprietario",
    )
    cig = models.CharField("CIG", max_length=10)
    cpv = models.CharField("CPV", max_length=8)
    importo = models.DecimalField("importo", max_digits=14, decimal_places=2)
    scadenza = models.DateField("scadenza")
    stato = models.CharField(
        "stato",
        max_length=20,
        choices=Stato.choices,
        default=Stato.BOZZA,
    )
    fase = models.CharField(
        "fase",
        max_length=20,
        choices=Fase.choices,
        default=Fase.DA_ANALIZZARE,
    )
    source = models.CharField(
        "fonte",
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )
    import_batch = models.ForeignKey(
        ImportBatch,
        on_delete=models.SET_NULL,
        related_name="tenders",
        verbose_name="importazione",
        null=True,
        blank=True,
    )
    oggetto = models.CharField("oggetto", max_length=500, blank=True)
    ai_extracted = models.BooleanField("estratto AI", default=False)
    extracted_at = models.DateTimeField("estratto il", null=True, blank=True)
    formal_rules = models.JSONField(
        "regole formali",
        default=default_formal_rules,
        blank=True,
    )
    priorita = models.CharField(
        "priorità",
        max_length=10,
        choices=Priorita.choices,
        default=Priorita.MEDIA,
    )
    priority_score = models.PositiveSmallIntegerField("punteggio priorità", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "gara"
        verbose_name_plural = "gare"
        ordering = ["-scadenza", "cig"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "cig"],
                name="unique_cig_per_organization",
            ),
        ]

    def __str__(self):
        return self.cig


class Document(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "In elaborazione"
        DONE = "done", "Completato"
        FAILED = "failed", "Errore"

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

    tender = models.ForeignKey(
        Tender,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="gara",
    )
    name = models.CharField("nome", max_length=255)
    file = models.FileField("file", upload_to=tender_document_path)
    original_filename = models.CharField("nome file originale", max_length=255)
    content_type = models.CharField("tipo MIME", max_length=128, blank=True)
    file_size = models.PositiveIntegerField("dimensione (byte)", default=0)
    status = models.CharField(
        "stato elaborazione",
        max_length=20,
        choices=Status.choices,
        default=Status.PROCESSING,
    )
    text_content = models.TextField("testo estratto", blank=True)
    error_message = models.TextField("messaggio errore", blank=True)
    validation_issues = models.JSONField("problemi rilevati", default=list, blank=True)
    embedding = VectorField(
        "embedding",
        dimensions=EMBEDDING_DIMENSIONS,
        null=True,
        blank=True,
    )
    uploaded_at = models.DateTimeField("caricato il", auto_now_add=True)

    class Meta:
        verbose_name = "documento"
        verbose_name_plural = "documenti"
        ordering = ["-uploaded_at"]
        indexes = [
            HnswIndex(
                name="document_embedding_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)


class DocumentChunk(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
        verbose_name="documento",
    )
    chunk_index = models.PositiveIntegerField("indice chunk")
    text = models.TextField("testo")
    char_start = models.PositiveIntegerField("inizio carattere", default=0)
    char_end = models.PositiveIntegerField("fine carattere", default=0)
    page_number = models.PositiveIntegerField("numero pagina", null=True, blank=True)
    embedding = VectorField(
        "embedding",
        dimensions=EMBEDDING_DIMENSIONS,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "chunk documento"
        verbose_name_plural = "chunk documenti"
        ordering = ["document_id", "chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="unique_chunk_per_document",
            ),
        ]
        indexes = [
            HnswIndex(
                name="doc_chunk_emb_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return f"{self.document.name} – chunk {self.chunk_index}"


class Requirement(models.Model):
    class Tipo(models.TextChoices):
        OBBLIGATORIO = "obbligatorio", "Obbligatorio"
        TECNICO = "tecnico", "Tecnico"
        ECONOMICO = "economico", "Economico"

    class Categoria(models.TextChoices):
        GENERALE = "generale", "Requisiti generali"
        IDONEITA_PROFESSIONALE = "idoneita_professionale", "Idoneità professionale"
        ECONOMICO_FINANZIARIO = "economico_finanziario", "Economico-finanziari"
        TECNICO_PROFESSIONALE = "tecnico_professionale", "Tecnico-professionali"
        CERTIFICAZIONE = "certificazione", "Certificazioni"

    tender = models.ForeignKey(
        Tender,
        on_delete=models.CASCADE,
        related_name="requirements",
        verbose_name="gara",
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="requirements",
        verbose_name="documento",
        null=True,
        blank=True,
    )
    tipo = models.CharField("tipo", max_length=20, choices=Tipo.choices)
    categoria = models.CharField(
        "categoria",
        max_length=32,
        choices=Categoria.choices,
        default=Categoria.GENERALE,
        blank=True,
    )
    descrizione = models.TextField("descrizione")
    soglia = models.CharField("soglia", max_length=255, blank=True)
    soglia_minima = models.CharField("soglia minima", max_length=255, blank=True)
    obbligatorio = models.BooleanField("obbligatorio", default=True)
    premiante = models.BooleanField("premiante", default=False)
    migliorativo = models.BooleanField("migliorativo", default=False)
    documento_origine = models.CharField("documento origine", max_length=255, blank=True)
    pagina_origine = models.CharField("pagina origine", max_length=50, blank=True)
    paragrafo_origine = models.CharField("paragrafo origine", max_length=100, blank=True)
    modalita_comprova = models.TextField("modalità di comprova", blank=True)
    soggetto_obbligato = models.CharField("soggetto obbligato", max_length=255, blank=True)
    avvalimento_consentito = models.BooleanField("avvalimento consentito", default=False)
    rti_consentito = models.BooleanField("RTI consentito", default=False)
    consorzio_consentito = models.BooleanField("consorzio consentito", default=False)
    note_interpretative = models.TextField("note interpretative", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "requisito"
        verbose_name_plural = "requisiti"
        ordering = ["categoria", "tipo", "-created_at"]

    def __str__(self):
        return f"{self.get_tipo_display()}: {self.descrizione[:50]}"


class EvaluationCriterion(models.Model):
    class Livello(models.TextChoices):
        CRITERIO = "criterio", "Criterio"
        SUBCRITERIO = "subcriterio", "Subcriterio"
        MICROCRITERIO = "microcriterio", "Microcriterio"

    tender = models.ForeignKey(
        Tender,
        on_delete=models.CASCADE,
        related_name="evaluation_criteria",
        verbose_name="gara",
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="evaluation_criteria",
        verbose_name="documento sorgente",
        null=True,
        blank=True,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        verbose_name="elemento padre",
        null=True,
        blank=True,
    )
    livello = models.CharField("livello", max_length=16, choices=Livello.choices)
    titolo = models.CharField("titolo", max_length=500)
    descrizione = models.TextField("descrizione", blank=True)
    punteggio_massimo = models.DecimalField(
        "punteggio massimo",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    punteggio_discrezionale = models.DecimalField(
        "punteggio discrezionale",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    punteggio_tabellare = models.DecimalField(
        "punteggio tabellare",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    soglia_minima = models.CharField("soglia minima", max_length=255, blank=True)
    elementi_premianti = models.JSONField(
        "elementi premianti",
        default=list,
        blank=True,
    )
    documento_origine = models.CharField("documento origine", max_length=255, blank=True)
    pagina_origine = models.CharField("pagina origine", max_length=50, blank=True)
    paragrafo_origine = models.CharField("paragrafo origine", max_length=100, blank=True)
    ordine = models.PositiveIntegerField("ordine", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "criterio di valutazione"
        verbose_name_plural = "criteri di valutazione"
        ordering = ["ordine", "id"]

    def __str__(self):
        return f"{self.get_livello_display()}: {self.titolo[:60]}"


class TenderEvaluation(models.Model):
    class Semaforo(models.TextChoices):
        VERDE = "verde", "Verde"
        GIALLO = "giallo", "Giallo"
        ROSSO = "rosso", "Rosso"

    tender = models.ForeignKey(
        Tender,
        on_delete=models.CASCADE,
        related_name="evaluations",
        verbose_name="gara",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="evaluations",
        verbose_name="azienda",
    )
    semaforo = models.CharField(
        "semaforo",
        max_length=10,
        choices=Semaforo.choices,
    )
    motivazione = models.TextField("motivazione")
    dettagli = models.JSONField("dettagli", default=list, blank=True)
    evaluated_at = models.DateTimeField("valutato il", auto_now=True)

    class Meta:
        verbose_name = "valutazione compatibilità"
        verbose_name_plural = "valutazioni compatibilità"
        unique_together = [("tender", "company")]
        ordering = ["company__name"]

    def __str__(self):
        return f"{self.company.name} / {self.tender.cig}: {self.semaforo}"


def default_technical_relation_outline():
    return {
        "criteria": [],
        "page_plan": {
            "max_pages": None,
            "total_suggested_pages": 0,
            "entries": [],
        },
        "formal_constraints": {},
        "source_summary": "",
    }


def default_technical_relation_sections():
    return []


class TechnicalRelation(models.Model):
    tender = models.OneToOneField(
        Tender,
        on_delete=models.CASCADE,
        related_name="technical_relation",
        verbose_name="gara",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        related_name="technical_relations",
        verbose_name="azienda",
        null=True,
        blank=True,
    )
    outline = models.JSONField(
        "outline relazione tecnica",
        default=default_technical_relation_outline,
        blank=True,
    )
    sections = models.JSONField(
        "sezioni",
        default=default_technical_relation_sections,
        blank=True,
    )
    generated_at = models.DateTimeField("outline generato il", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "relazione tecnica"
        verbose_name_plural = "relazioni tecniche"

    def __str__(self):
        return f"Relazione tecnica – {self.tender.cig}"


class TechnicalRelationVersion(models.Model):
    relation = models.ForeignKey(
        TechnicalRelation,
        on_delete=models.CASCADE,
        related_name="versions",
        verbose_name="relazione tecnica",
    )
    version = models.PositiveIntegerField("versione")
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        related_name="technical_relation_versions",
        verbose_name="azienda",
        null=True,
        blank=True,
    )
    outline = models.JSONField("outline", default=default_technical_relation_outline, blank=True)
    sections = models.JSONField("sezioni", default=default_technical_relation_sections, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="technical_relation_versions",
        verbose_name="creato da",
        null=True,
        blank=True,
    )
    change_note = models.CharField("nota modifica", max_length=255, blank=True)
    created_at = models.DateTimeField("creato il", auto_now_add=True)

    class Meta:
        verbose_name = "versione relazione tecnica"
        verbose_name_plural = "versioni relazione tecnica"
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["relation", "version"],
                name="unique_technical_relation_version",
            ),
        ]

    def __str__(self):
        return f"Relazione tecnica v{self.version} – {self.relation.tender.cig}"
