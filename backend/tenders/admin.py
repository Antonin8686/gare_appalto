from django.contrib import admin

from .models import Document, EvaluationCriterion, ImportBatch, Requirement, Tender


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0
    readonly_fields = ("uploaded_at", "file_size", "content_type")


class RequirementInline(admin.TabularInline):
    model = Requirement
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = (
        "original_filename",
        "source",
        "status",
        "tenders_created",
        "owner",
        "uploaded_at",
    )
    list_filter = ("source", "status", "uploaded_at")
    search_fields = ("original_filename", "owner__email")
    readonly_fields = ("uploaded_at", "file_size", "content_type", "tenders_created", "error_message")


@admin.register(Tender)
class TenderAdmin(admin.ModelAdmin):
    list_display = (
        "cig",
        "cpv",
        "importo",
        "scadenza",
        "stato",
        "fase",
        "source",
        "ai_extracted",
        "owner",
        "updated_at",
    )
    list_filter = ("stato", "fase", "source", "scadenza", "created_at")
    search_fields = ("cig", "cpv", "owner__email")
    readonly_fields = ("created_at", "updated_at")
    inlines = [DocumentInline, RequirementInline]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("name", "tender", "status", "original_filename", "file_size", "uploaded_at")
    list_filter = ("status", "uploaded_at")
    search_fields = ("name", "original_filename", "tender__cig")
    readonly_fields = (
        "uploaded_at",
        "file_size",
        "content_type",
        "original_filename",
        "status",
        "text_content",
        "error_message",
        "validation_issues",
    )


@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = (
        "tipo",
        "categoria",
        "descrizione",
        "soglia_minima",
        "obbligatorio",
        "tender",
        "document",
        "created_at",
    )
    list_filter = ("tipo", "categoria", "obbligatorio", "premiante", "migliorativo", "created_at")
    search_fields = (
        "descrizione",
        "soglia",
        "soglia_minima",
        "documento_origine",
        "tender__cig",
    )
    readonly_fields = ("created_at",)


@admin.register(EvaluationCriterion)
class EvaluationCriterionAdmin(admin.ModelAdmin):
    list_display = (
        "livello",
        "titolo",
        "punteggio_massimo",
        "punteggio_discrezionale",
        "punteggio_tabellare",
        "tender",
        "document",
        "ordine",
    )
    list_filter = ("livello", "tender", "created_at")
    search_fields = ("titolo", "descrizione", "documento_origine", "tender__cig")
    readonly_fields = ("created_at",)
