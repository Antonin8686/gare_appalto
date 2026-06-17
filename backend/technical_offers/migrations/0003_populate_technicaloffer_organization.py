from django.db import migrations


def forwards_populate_organization(apps, schema_editor):
    TechnicalOffer = apps.get_model("technical_offers", "TechnicalOffer")
    for offer in TechnicalOffer.objects.select_related("owner").iterator():
        if offer.owner_id and offer.owner.organization_id:
            offer.organization_id = offer.owner.organization_id
            offer.save(update_fields=["organization_id"])


def backwards_clear_organization(apps, schema_editor):
    TechnicalOffer = apps.get_model("technical_offers", "TechnicalOffer")
    TechnicalOffer.objects.update(organization=None)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_organization_alter_user_organization"),
        ("technical_offers", "0002_technicaloffer_organization"),
    ]

    operations = [
        migrations.RunPython(forwards_populate_organization, backwards_clear_organization),
    ]
