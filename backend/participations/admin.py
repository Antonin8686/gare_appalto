from django.contrib import admin

from .models import Consorzio, ImpresaAusiliaria, RTI, RTIMember


class RTIMemberInline(admin.TabularInline):
    model = RTIMember
    extra = 0


@admin.register(RTI)
class RTIAdmin(admin.ModelAdmin):
    list_display = ("nome", "mandataria", "tender", "organization", "updated_at")
    list_filter = ("organization", "updated_at")
    search_fields = ("nome", "mandataria__name", "tender__cig")
    inlines = [RTIMemberInline]


@admin.register(Consorzio)
class ConsorzioAdmin(admin.ModelAdmin):
    list_display = ("nome", "mandataria", "tender", "organization", "updated_at")
    list_filter = ("organization", "updated_at")
    search_fields = ("nome", "mandataria__name", "tender__cig")


@admin.register(ImpresaAusiliaria)
class ImpresaAusiliariaAdmin(admin.ModelAdmin):
    list_display = (
        "impresa_principale",
        "impresa_ausiliaria",
        "tender",
        "organization",
        "updated_at",
    )
    list_filter = ("organization", "updated_at")
    search_fields = (
        "impresa_principale__name",
        "impresa_ausiliaria__name",
        "tender__cig",
    )
