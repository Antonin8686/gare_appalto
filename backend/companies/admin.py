from django.contrib import admin

from .models import Company, CompanyDocument


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "partita_iva",
        "forma_giuridica",
        "owner",
        "fatturato",
        "updated_at",
    )
    list_filter = ("forma_giuridica", "created_at")
    search_fields = (
        "name",
        "partita_iva",
        "codice_fiscale",
        "owner__email",
        "owner__first_name",
        "owner__last_name",
    )
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Anagrafica",
            {
                "fields": (
                    "name",
                    "partita_iva",
                    "codice_fiscale",
                    "forma_giuridica",
                    "oggetto_sociale",
                    "owner",
                    "organization",
                ),
            },
        ),
        (
            "Dati societari",
            {
                "fields": (
                    "iscrizione_cciaa",
                    "codici_ateco",
                    "sedi_legali",
                    "sedi_operative",
                    "autorizzazioni",
                    "licenze",
                    "rating_legalita",
                    "attestazioni_soa",
                    "referenze_bancarie",
                    "polizze_assicurative",
                    "presenza_territoriale",
                ),
            },
        ),
        (
            "Profilo operativo",
            {
                "fields": (
                    "fatturato",
                    "ccnl",
                    "dipendenti",
                    "esperienze",
                    "certificazioni",
                    "servizi",
                ),
            },
        ),
        ("Metadati", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(CompanyDocument)
class CompanyDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "original_filename",
        "company",
        "categoria",
        "stato_validita",
        "data_scadenza",
        "uploaded_at",
    )
    list_filter = ("categoria", "stato_validita", "uploaded_at")
    search_fields = ("original_filename", "note", "company__name")
    readonly_fields = ("uploaded_at", "updated_at", "stato_validita")
    raw_id_fields = ("company",)
