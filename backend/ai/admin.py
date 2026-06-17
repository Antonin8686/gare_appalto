from django.contrib import admin

from .models import AiGeneration


@admin.register(AiGeneration)
class AiGenerationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "action_type",
        "model",
        "provider",
        "tender",
        "section_id",
        "user",
        "created_at",
    )
    list_filter = ("action_type", "provider", "organization")
    search_fields = ("prompt", "response", "section_id")
    readonly_fields = ("created_at",)
