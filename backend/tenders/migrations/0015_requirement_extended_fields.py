# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenders", "0014_populate_tender_organization"),
    ]

    operations = [
        migrations.AddField(
            model_name="requirement",
            name="categoria",
            field=models.CharField(
                blank=True,
                choices=[
                    ("generale", "Requisiti generali"),
                    ("idoneita_professionale", "Idoneità professionale"),
                    ("economico_finanziario", "Economico-finanziari"),
                    ("tecnico_professionale", "Tecnico-professionali"),
                    ("certificazione", "Certificazioni"),
                ],
                default="generale",
                max_length=32,
                verbose_name="categoria",
            ),
        ),
        migrations.AddField(
            model_name="requirement",
            name="obbligatorio",
            field=models.BooleanField(default=True, verbose_name="obbligatorio"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="premiante",
            field=models.BooleanField(default=False, verbose_name="premiante"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="migliorativo",
            field=models.BooleanField(default=False, verbose_name="migliorativo"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="documento_origine",
            field=models.CharField(blank=True, max_length=255, verbose_name="documento origine"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="pagina_origine",
            field=models.CharField(blank=True, max_length=50, verbose_name="pagina origine"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="paragrafo_origine",
            field=models.CharField(blank=True, max_length=100, verbose_name="paragrafo origine"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="modalita_comprova",
            field=models.TextField(blank=True, verbose_name="modalità di comprova"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="soggetto_obbligato",
            field=models.CharField(blank=True, max_length=255, verbose_name="soggetto obbligato"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="avvalimento_consentito",
            field=models.BooleanField(default=False, verbose_name="avvalimento consentito"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="rti_consentito",
            field=models.BooleanField(default=False, verbose_name="RTI consentito"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="consorzio_consentito",
            field=models.BooleanField(default=False, verbose_name="consorzio consentito"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="soglia_minima",
            field=models.CharField(blank=True, max_length=255, verbose_name="soglia minima"),
        ),
        migrations.AddField(
            model_name="requirement",
            name="note_interpretative",
            field=models.TextField(blank=True, verbose_name="note interpretative"),
        ),
        migrations.AlterModelOptions(
            name="requirement",
            options={
                "ordering": ["categoria", "tipo", "-created_at"],
                "verbose_name": "requisito",
                "verbose_name_plural": "requisiti",
            },
        ),
    ]
