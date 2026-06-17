# Generated manually for corporate data extension

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0004_populate_company_organization"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="partita_iva",
            field=models.CharField(blank=True, default="", max_length=11, verbose_name="partita IVA"),
        ),
        migrations.AddField(
            model_name="company",
            name="codice_fiscale",
            field=models.CharField(blank=True, default="", max_length=16, verbose_name="codice fiscale"),
        ),
        migrations.AddField(
            model_name="company",
            name="forma_giuridica",
            field=models.CharField(
                blank=True,
                choices=[
                    ("srl", "S.r.l."),
                    ("spa", "S.p.A."),
                    ("snc", "S.n.c."),
                    ("sas", "S.a.s."),
                    ("cooperativa", "Cooperativa"),
                    ("ditta_individuale", "Ditta individuale"),
                    ("consorzio", "Consorzio"),
                    ("altro", "Altro"),
                ],
                default="",
                max_length=32,
                verbose_name="forma giuridica",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="iscrizione_cciaa",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='{"rea": str, "provincia": str, "data_iscrizione": str|null}',
                verbose_name="iscrizione CCIAA",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="codici_ateco",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"codice": str, "descrizione": str}',
                verbose_name="codici ATECO",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="oggetto_sociale",
            field=models.TextField(blank=True, default="", verbose_name="oggetto sociale"),
        ),
        migrations.AddField(
            model_name="company",
            name="sedi_legali",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"indirizzo", "cap", "citta", "provincia", "nazione", "principale"}',
                verbose_name="sedi legali",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="sedi_operative",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Stessa struttura delle sedi legali",
                verbose_name="sedi operative",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="autorizzazioni",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"nome", "ente", "numero", "scadenza"}',
                verbose_name="autorizzazioni",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="licenze",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"nome", "ente", "numero", "scadenza"}',
                verbose_name="licenze",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="rating_legalita",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='{"stelle": int, "ente": str, "scadenza": str|null}',
                verbose_name="rating di legalità",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="attestazioni_soa",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"categoria", "classifica", "scadenza"}',
                verbose_name="attestazioni SOA",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="referenze_bancarie",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"istituto", "filiale", "iban", "note"}',
                verbose_name="referenze bancarie",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="polizze_assicurative",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"tipo", "compagnia", "massimale", "scadenza"}',
                verbose_name="polizze assicurative",
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="presenza_territoriale",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista di {"regione", "province": [str], "note"}',
                verbose_name="presenza territoriale",
            ),
        ),
        migrations.AddConstraint(
            model_name="company",
            constraint=models.UniqueConstraint(
                condition=models.Q(("partita_iva__gt", "")),
                fields=("organization", "partita_iva"),
                name="unique_partita_iva_per_organization",
            ),
        ),
    ]
