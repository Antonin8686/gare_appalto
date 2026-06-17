# Generated manually for document processing fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenders", "0002_document"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="status",
            field=models.CharField(
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
        migrations.AddField(
            model_name="document",
            name="text_content",
            field=models.TextField(blank=True, verbose_name="testo estratto"),
        ),
    ]
