from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenders", "0019_alter_source_welfare"),
    ]

    operations = [
        migrations.AddField(
            model_name="tender",
            name="provincia",
            field=models.CharField(blank=True, max_length=2, verbose_name="provincia"),
        ),
        migrations.AddField(
            model_name="tender",
            name="regione",
            field=models.CharField(blank=True, max_length=64, verbose_name="regione"),
        ),
        migrations.AddField(
            model_name="tender",
            name="zona",
            field=models.CharField(blank=True, max_length=255, verbose_name="zona"),
        ),
        migrations.AddField(
            model_name="tenderimportsnapshot",
            name="provincia",
            field=models.CharField(blank=True, max_length=2, verbose_name="provincia"),
        ),
        migrations.AddField(
            model_name="tenderimportsnapshot",
            name="regione",
            field=models.CharField(blank=True, max_length=64, verbose_name="regione"),
        ),
        migrations.AddField(
            model_name="tenderimportsnapshot",
            name="zona",
            field=models.CharField(blank=True, max_length=255, verbose_name="zona"),
        ),
    ]
