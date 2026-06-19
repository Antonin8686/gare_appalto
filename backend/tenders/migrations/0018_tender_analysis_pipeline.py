from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tenders", "0017_document_validation_errors"),
    ]

    operations = [
        migrations.AddField(
            model_name="importbatch",
            name="tenders_updated",
            field=models.PositiveIntegerField(default=0, verbose_name="gare aggiornate"),
        ),
        migrations.AddField(
            model_name="tender",
            name="stazione_appaltante",
            field=models.CharField(blank=True, max_length=255, verbose_name="stazione appaltante"),
        ),
        migrations.AddField(
            model_name="tender",
            name="durata",
            field=models.CharField(blank=True, max_length=100, verbose_name="durata"),
        ),
        migrations.AddField(
            model_name="tender",
            name="document_url",
            field=models.URLField(blank=True, max_length=2048, verbose_name="URL documentazione"),
        ),
        migrations.AddField(
            model_name="tender",
            name="scheda",
            field=models.JSONField(blank=True, default=dict, verbose_name="scheda gara"),
        ),
        migrations.AddField(
            model_name="tender",
            name="scheda_generated_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="scheda generata il"),
        ),
        migrations.AddField(
            model_name="document",
            name="doc_type",
            field=models.CharField(
                choices=[
                    ("disciplinare", "Disciplinare"),
                    ("capitolato", "Capitolato"),
                    ("allegato", "Allegato"),
                    ("altro", "Altro"),
                ],
                default="altro",
                max_length=20,
                verbose_name="tipo documento",
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="source",
            field=models.CharField(
                choices=[("manual", "Manuale"), ("download", "Download automatico")],
                default="manual",
                max_length=20,
                verbose_name="origine",
            ),
        ),
        migrations.CreateModel(
            name="TenderImportSnapshot",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("cig", models.CharField(max_length=10, verbose_name="CIG")),
                ("cpv", models.CharField(blank=True, max_length=8, verbose_name="CPV")),
                (
                    "importo",
                    models.DecimalField(
                        decimal_places=2, default=0, max_digits=14, verbose_name="importo"
                    ),
                ),
                ("scadenza", models.DateField(verbose_name="scadenza")),
                ("stato", models.CharField(max_length=20, verbose_name="stato")),
                ("oggetto", models.CharField(blank=True, max_length=500, verbose_name="oggetto")),
                (
                    "stazione_appaltante",
                    models.CharField(blank=True, max_length=255, verbose_name="stazione appaltante"),
                ),
                ("durata", models.CharField(blank=True, max_length=100, verbose_name="durata")),
                (
                    "document_url",
                    models.URLField(blank=True, max_length=2048, verbose_name="URL documentazione"),
                ),
                ("detected_at", models.DateTimeField(auto_now_add=True, verbose_name="rilevata il")),
                (
                    "import_batch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="snapshots",
                        to="tenders.importbatch",
                        verbose_name="importazione",
                    ),
                ),
                (
                    "tender",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="import_snapshots",
                        to="tenders.tender",
                        verbose_name="gara",
                    ),
                ),
            ],
            options={
                "verbose_name": "snapshot importazione gara",
                "verbose_name_plural": "snapshot importazioni gare",
                "ordering": ["-detected_at"],
            },
        ),
    ]
