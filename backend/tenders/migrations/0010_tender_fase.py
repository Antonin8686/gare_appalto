from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tenders", "0009_tender_priority"),
    ]

    operations = [
        migrations.AddField(
            model_name="tender",
            name="fase",
            field=models.CharField(
                choices=[
                    ("da_analizzare", "Da analizzare"),
                    ("in_corso", "In corso"),
                    ("partecipabile", "Partecipabile"),
                    ("esclusa", "Esclusa"),
                    ("offerta", "Offerta"),
                ],
                default="da_analizzare",
                max_length=20,
                verbose_name="fase",
            ),
        ),
    ]
