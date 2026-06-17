# Generated manually

import companies.models
from django.db import migrations, models
import companies.models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0005_company_corporate_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "categoria",
                    models.CharField(
                        choices=[
                            ("durc", "DURC"),
                            ("visura_camerale", "Visura Camerale"),
                            ("certificazione_iso", "Certificazione ISO"),
                            ("bilancio", "Bilancio"),
                            ("polizza", "Polizza"),
                            ("dichiarazione", "Dichiarazione"),
                            ("personalizzato", "Documento Personalizzato"),
                        ],
                        default="personalizzato",
                        max_length=32,
                        verbose_name="categoria",
                    ),
                ),
                ("file", models.FileField(upload_to=companies.models.company_document_path, verbose_name="file")),
                ("original_filename", models.CharField(max_length=255, verbose_name="nome file originale")),
                ("content_type", models.CharField(blank=True, max_length=128, verbose_name="tipo MIME")),
                ("file_size", models.PositiveIntegerField(default=0, verbose_name="dimensione (byte)")),
                ("data_rilascio", models.DateField(blank=True, null=True, verbose_name="data rilascio")),
                ("data_scadenza", models.DateField(blank=True, null=True, verbose_name="data scadenza")),
                ("note", models.TextField(blank=True, verbose_name="note")),
                (
                    "stato_validita",
                    models.CharField(
                        choices=[
                            ("valido", "Valido"),
                            ("in_scadenza", "In scadenza"),
                            ("scaduto", "Scaduto"),
                            ("senza_scadenza", "Senza scadenza"),
                        ],
                        default="senza_scadenza",
                        max_length=20,
                        verbose_name="stato validità",
                    ),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True, verbose_name="caricato il")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="documents",
                        to="companies.company",
                        verbose_name="azienda",
                    ),
                ),
            ],
            options={
                "verbose_name": "documento aziendale",
                "verbose_name_plural": "documenti aziendali",
                "ordering": ["data_scadenza", "-uploaded_at"],
            },
        ),
    ]
