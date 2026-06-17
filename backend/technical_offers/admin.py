from django.contrib import admin

from .models import TechnicalOffer


@admin.register(TechnicalOffer)
class TechnicalOfferAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "settore",
        "ente_appaltante",
        "anno",
        "riutilizzabilita",
        "innovativita",
        "owner",
        "updated_at",
    )
    list_filter = (
        "category",
        "settore",
        "anno",
        "riutilizzabilita",
        "innovativita",
        "created_at",
    )
    search_fields = (
        "title",
        "content",
        "ente_appaltante",
        "tipologia_servizio",
        "rag_text",
        "owner__email",
    )
    readonly_fields = ("rag_text", "rag_metadata", "created_at", "updated_at")
