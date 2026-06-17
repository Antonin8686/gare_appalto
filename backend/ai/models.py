from django.conf import settings
from django.db import models

from .constants import AiActionType, LlmProvider


class AiGeneration(models.Model):
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="ai_generations",
        verbose_name="organizzazione",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="ai_generations",
        verbose_name="utente",
        null=True,
        blank=True,
    )
    tender = models.ForeignKey(
        "tenders.Tender",
        on_delete=models.CASCADE,
        related_name="ai_generations",
        verbose_name="gara",
        null=True,
        blank=True,
    )
    section_id = models.CharField("ID sezione", max_length=64, blank=True, default="")
    action_type = models.CharField(
        "azione",
        max_length=32,
        choices=[(value, AiActionType.LABELS[value]) for value in AiActionType.CHOICES],
        db_index=True,
    )
    prompt = models.TextField("prompt")
    prompt_messages = models.JSONField("messaggi prompt", default=list, blank=True)
    model = models.CharField("modello", max_length=128)
    provider = models.CharField(
        "provider",
        max_length=32,
        choices=[(LlmProvider.OPENAI, "OpenAI"), (LlmProvider.AZURE_OPENAI, "Azure OpenAI")],
    )
    response = models.TextField("risposta")
    sources = models.JSONField("fonti RAG", default=list, blank=True)
    rag_chunks = models.JSONField("chunk RAG", default=list, blank=True)
    prompt_tokens = models.PositiveIntegerField("token prompt", null=True, blank=True)
    completion_tokens = models.PositiveIntegerField("token risposta", null=True, blank=True)
    created_at = models.DateTimeField("generato il", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "generazione AI"
        verbose_name_plural = "generazioni AI"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "tender", "-created_at"]),
            models.Index(fields=["organization", "action_type", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.get_action_type_display()} – {self.model} ({self.created_at:%Y-%m-%d %H:%M})"
