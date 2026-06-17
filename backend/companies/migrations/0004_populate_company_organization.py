from django.db import migrations


def forwards_populate_organization(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    for company in Company.objects.select_related("owner").iterator():
        if company.owner_id and company.owner.organization_id:
            company.organization_id = company.owner.organization_id
            company.save(update_fields=["organization_id"])


def backwards_clear_organization(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    Company.objects.update(organization=None)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_organization_alter_user_organization"),
        ("companies", "0003_company_organization"),
    ]

    operations = [
        migrations.RunPython(forwards_populate_organization, backwards_clear_organization),
    ]
