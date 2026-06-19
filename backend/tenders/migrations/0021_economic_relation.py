from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import tenders.models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("tenders", "0020_tender_location_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="technicalrelation",
            name="auto_generated",
            field=models.BooleanField(default=False, verbose_name="generata automaticamente"),
        ),
        migrations.CreateModel(
            name="EconomicRelation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "outline",
                    models.JSONField(
                        blank=True,
                        default=tenders.models.default_economic_relation_outline,
                        verbose_name="outline offerta economica",
                    ),
                ),
                (
                    "line_items",
                    models.JSONField(
                        blank=True,
                        default=tenders.models.default_economic_relation_line_items,
                        verbose_name="voci economiche",
                    ),
                ),
                ("generated_at", models.DateTimeField(blank=True, null=True, verbose_name="outline generato il")),
                ("auto_generated", models.BooleanField(default=False, verbose_name="generata automaticamente")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="economic_relations",
                        to="companies.company",
                        verbose_name="azienda",
                    ),
                ),
                (
                    "tender",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="economic_relation",
                        to="tenders.tender",
                        verbose_name="gara",
                    ),
                ),
            ],
            options={
                "verbose_name": "offerta economica",
                "verbose_name_plural": "offerte economiche",
            },
        ),
        migrations.CreateModel(
            name="EconomicRelationVersion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version", models.PositiveIntegerField(verbose_name="versione")),
                (
                    "outline",
                    models.JSONField(
                        blank=True,
                        default=tenders.models.default_economic_relation_outline,
                        verbose_name="outline",
                    ),
                ),
                (
                    "line_items",
                    models.JSONField(
                        blank=True,
                        default=tenders.models.default_economic_relation_line_items,
                        verbose_name="voci",
                    ),
                ),
                ("change_note", models.CharField(blank=True, max_length=255, verbose_name="nota modifica")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="creato il")),
                (
                    "company",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="economic_relation_versions",
                        to="companies.company",
                        verbose_name="azienda",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="economic_relation_versions",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="creato da",
                    ),
                ),
                (
                    "relation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="versions",
                        to="tenders.economicrelation",
                        verbose_name="offerta economica",
                    ),
                ),
            ],
            options={
                "verbose_name": "versione offerta economica",
                "verbose_name_plural": "versioni offerta economica",
                "ordering": ["-version"],
            },
        ),
        migrations.AddConstraint(
            model_name="economicrelationversion",
            constraint=models.UniqueConstraint(
                fields=("relation", "version"),
                name="unique_economic_relation_version",
            ),
        ),
    ]
