from django.contrib import admin

from .models import RagChunk


@admin.register(RagChunk)
class RagChunkAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "source_type",
        "source_id",
        "chunk_index",
        "title",
        "organization",
        "indexed_at",
    )
    list_filter = ("source_type", "organization")
    search_fields = ("title", "text", "metadata")
    readonly_fields = ("indexed_at",)
