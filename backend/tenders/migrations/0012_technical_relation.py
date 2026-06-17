import django.db.models.deletion
from django.db import migrations, models

import tenders.models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0002_company_extended_fields"),
        ("tenders", "0011_document_embedding"),
    ]

    operations = [
        migrations.CreateModel(
            name="TechnicalRelation",
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
                    "outline",
                    models.JSONField(
                        blank=True,
                        default=tenders.models.default_technical_relation_outline,
                        verbose_name="outline relazione tecnica",
                    ),
                ),
                (
                    "sections",
                    models.JSONField(
                        blank=True,
                        default=tenders.models.default_technical_relation_sections,
                        verbose_name="sezioni",
                    ),
                ),
                (
                    "generated_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="outline generato il",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="technical_relations",
                        to="companies.company",
                        verbose_name="azienda",
                    ),
                ),
                (
                    "tender",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="technical_relation",
                        to="tenders.tender",
                        verbose_name="gara",
                    ),
                ),
            ],
            options={
                "verbose_name": "relazione tecnica",
                "verbose_name_plural": "relazioni tecniche",
            },
        ),
    ]
