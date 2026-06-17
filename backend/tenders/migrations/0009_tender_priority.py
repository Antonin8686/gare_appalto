from django.db import migrations, models


def score_existing_tenders(apps, schema_editor):
    Tender = apps.get_model("tenders", "Tender")
    TenderEvaluation = apps.get_model("tenders", "TenderEvaluation")

    def score_importo(importo):
        if importo >= 500000:
            return 35
        if importo >= 100000:
            return 25
        if importo >= 30000:
            return 15
        return 5

    def score_scadenza(scadenza, today):
        days = (scadenza - today).days
        if days < 0:
            return 0
        if days <= 14:
            return 35
        if days <= 30:
            return 25
        if days <= 60:
            return 15
        return 5

    def score_stato(stato):
        if stato == "aperta":
            return 20
        if stato == "bozza":
            return 10
        return 0

    def best_semaforo(tender_id):
        evaluations = list(
            TenderEvaluation.objects.filter(tender_id=tender_id).values_list("semaforo", flat=True)
        )
        if not evaluations:
            return None
        if "verde" in evaluations:
            return "verde"
        if "giallo" in evaluations:
            return "giallo"
        return "rosso"

    def score_compatibilita(best):
        if best == "verde":
            return 10
        if best == "giallo":
            return 5
        if best == "rosso":
            return 0
        return 3

    def priorita_from_score(score):
        if score >= 70:
            return "alta"
        if score >= 40:
            return "media"
        return "bassa"

    from datetime import date

    today = date.today()
    for tender in Tender.objects.all().iterator():
        score = min(
            score_importo(tender.importo)
            + score_scadenza(tender.scadenza, today)
            + score_stato(tender.stato)
            + score_compatibilita(best_semaforo(tender.id)),
            100,
        )
        tender.priority_score = score
        tender.priorita = priorita_from_score(score)
        tender.save(update_fields=["priority_score", "priorita"])


class Migration(migrations.Migration):
    dependencies = [
        ("tenders", "0008_importbatch_tender_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="tender",
            name="priorita",
            field=models.CharField(
                choices=[("alta", "Alta"), ("media", "Media"), ("bassa", "Bassa")],
                default="media",
                max_length=10,
                verbose_name="priorità",
            ),
        ),
        migrations.AddField(
            model_name="tender",
            name="priority_score",
            field=models.PositiveSmallIntegerField(default=0, verbose_name="punteggio priorità"),
        ),
        migrations.RunPython(score_existing_tenders, migrations.RunPython.noop),
    ]
