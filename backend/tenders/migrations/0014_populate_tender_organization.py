from django.db import migrations


def forwards_populate_organization(apps, schema_editor):
    Tender = apps.get_model("tenders", "Tender")
    ImportBatch = apps.get_model("tenders", "ImportBatch")

    for tender in Tender.objects.select_related("owner").iterator():
        if tender.owner_id and tender.owner.organization_id:
            tender.organization_id = tender.owner.organization_id
            tender.save(update_fields=["organization_id"])

    for batch in ImportBatch.objects.select_related("owner").iterator():
        if batch.owner_id and batch.owner.organization_id:
            batch.organization_id = batch.owner.organization_id
            batch.save(update_fields=["organization_id"])


def backwards_clear_organization(apps, schema_editor):
    Tender = apps.get_model("tenders", "Tender")
    ImportBatch = apps.get_model("tenders", "ImportBatch")
    Tender.objects.update(organization=None)
    ImportBatch.objects.update(organization=None)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_organization_alter_user_organization"),
        ("tenders", "0013_documentchunk_technicalrelationversion_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards_populate_organization, backwards_clear_organization),
    ]
