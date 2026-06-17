import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenders", "0004_tender_ai_extracted"),
    ]

    operations = [
        migrations.CreateModel(
            name="Requirement",
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
                    "tipo",
                    models.CharField(
                        choices=[
                            ("obbligatorio", "Obbligatorio"),
                            ("tecnico", "Tecnico"),
                            ("economico", "Economico"),
                        ],
                        max_length=20,
                        verbose_name="tipo",
                    ),
                ),
                ("descrizione", models.TextField(verbose_name="descrizione")),
                (
                    "soglia",
                    models.CharField(blank=True, max_length=255, verbose_name="soglia"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="requirements",
                        to="tenders.document",
                        verbose_name="documento",
                    ),
                ),
                (
                    "tender",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="requirements",
                        to="tenders.tender",
                        verbose_name="gara",
                    ),
                ),
            ],
            options={
                "verbose_name": "requisito",
                "verbose_name_plural": "requisiti",
                "ordering": ["tipo", "-created_at"],
            },
        ),
    ]
