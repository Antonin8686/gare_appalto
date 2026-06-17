from django.db import migrations, models

import tenders.models


class Migration(migrations.Migration):

    dependencies = [
        ("tenders", "0005_requirement"),
    ]

    operations = [
        migrations.AddField(
            model_name="tender",
            name="formal_rules",
            field=models.JSONField(
                blank=True,
                default=tenders.models.default_formal_rules,
                verbose_name="regole formali",
            ),
        ),
    ]
