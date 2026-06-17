import tenders.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("tenders", "0007_tenderevaluation"),
    ]

    operations = [
        migrations.CreateModel(
            name="ImportBatch",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "source",
                    models.CharField(
                        choices=[("scouting", "Scouting"), ("telemat", "Telemat")],
                        max_length=20,
                        verbose_name="fonte",
                    ),
                ),
                ("file", models.FileField(upload_to=tenders.models.import_batch_path, verbose_name="file")),
                (
                    "original_filename",
                    models.CharField(max_length=255, verbose_name="nome file originale"),
                ),
                ("content_type", models.CharField(blank=True, max_length=128, verbose_name="tipo MIME")),
                ("file_size", models.PositiveIntegerField(default=0, verbose_name="dimensione (byte)")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("processing", "In elaborazione"),
                            ("done", "Completato"),
                            ("failed", "Errore"),
                        ],
                        default="processing",
                        max_length=20,
                        verbose_name="stato elaborazione",
                    ),
                ),
                ("tenders_created", models.PositiveIntegerField(default=0, verbose_name="gare create")),
                ("error_message", models.TextField(blank=True, verbose_name="messaggio errore")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True, verbose_name="caricato il")),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="import_batches",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="proprietario",
                    ),
                ),
            ],
            options={
                "verbose_name": "importazione",
                "verbose_name_plural": "importazioni",
                "ordering": ["-uploaded_at"],
            },
        ),
        migrations.AddField(
            model_name="tender",
            name="oggetto",
            field=models.CharField(blank=True, max_length=500, verbose_name="oggetto"),
        ),
        migrations.AddField(
            model_name="tender",
            name="source",
            field=models.CharField(
                choices=[
                    ("manual", "Manuale"),
                    ("scouting", "Scouting"),
                    ("telemat", "Telemat"),
                ],
                default="manual",
                max_length=20,
                verbose_name="fonte",
            ),
        ),
        migrations.AddField(
            model_name="tender",
            name="import_batch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tenders",
                to="tenders.importbatch",
                verbose_name="importazione",
            ),
        ),
    ]
