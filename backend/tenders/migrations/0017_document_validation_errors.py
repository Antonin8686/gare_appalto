from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tenders", "0016_evaluationcriterion"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="error_message",
            field=models.TextField(blank=True, verbose_name="messaggio errore"),
        ),
        migrations.AddField(
            model_name="document",
            name="validation_issues",
            field=models.JSONField(blank=True, default=list, verbose_name="problemi rilevati"),
        ),
    ]
