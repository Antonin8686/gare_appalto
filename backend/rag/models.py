from django.db import models
from pgvector.django import HnswIndex, VectorField

from .constants import EMBEDDING_DIMENSIONS


class RagChunk(models.Model):
    class SourceType(models.TextChoices):
        TENDER_DOCUMENT = "tender_document", "Documento gara"
        TECHNICAL_OFFER = "technical_offer", "Offerta tecnica"
        REQUIREMENT = "requirement", "Requisito"
        COMPANY = "company", "Dati aziendali"

    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="rag_chunks",
        verbose_name="organizzazione",
        null=True,
        blank=True,
    )
    source_type = models.CharField(
        "tipo sorgente",
        max_length=32,
        choices=SourceType.choices,
        db_index=True,
    )
    source_id = models.PositiveIntegerField("ID sorgente", db_index=True)
    chunk_index = models.PositiveIntegerField("indice chunk", default=0)
    title = models.CharField("titolo", max_length=512)
    text = models.TextField("testo")
    metadata = models.JSONField("metadati", default=dict, blank=True)
    embedding = VectorField(dimensions=EMBEDDING_DIMENSIONS)
    indexed_at = models.DateTimeField("indicizzato il", auto_now=True)

    class Meta:
        verbose_name = "chunk RAG"
        verbose_name_plural = "chunk RAG"
        ordering = ["source_type", "source_id", "chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_type", "source_id", "chunk_index"],
                name="unique_rag_chunk_per_source",
            ),
        ]
        indexes = [
            HnswIndex(
                name="rag_chunk_embedding_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
            models.Index(fields=["organization", "source_type"]),
            models.Index(fields=["organization", "source_type", "source_id"]),
        ]

    def __str__(self):
        return f"{self.get_source_type_display()} #{self.source_id} [{self.chunk_index}]"
