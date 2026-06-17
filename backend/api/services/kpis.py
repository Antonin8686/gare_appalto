from datetime import date, timedelta

from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.db.models.functions import TruncWeek
from django.utils import timezone

from companies.models import Company
from companies.services.document_validity import get_expiring_documents
from participations.models import ImpresaAusiliaria, RTI
from technical_offers.models import TechnicalOffer
from tenders.models import ImportBatch, TechnicalRelation, Tender, TenderEvaluation

PERIOD_DAYS = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
}


def _tender_brief(tender: Tender) -> dict:
    return {
        "id": tender.id,
        "cig": tender.cig,
        "oggetto": tender.oggetto,
        "importo": str(tender.importo),
        "scadenza": tender.scadenza.isoformat(),
        "stato": tender.stato,
        "fase": tender.fase,
        "source": tender.source,
        "priorita": tender.priorita,
        "priority_score": tender.priority_score,
    }


def _giorni_rimanenti(scadenza: date, today: date) -> int:
    return (scadenza - today).days


def _relation_with_sections_exists():
    return TechnicalRelation.objects.filter(tender_id=OuterRef("pk")).exclude(sections=[])


def _apply_tender_filters(queryset, *, source: str | None, fase: str | None, period_days: int | None):
    if source:
        queryset = queryset.filter(source=source)
    if fase:
        queryset = queryset.filter(fase=fase)
    if period_days is not None:
        since = timezone.now() - timedelta(days=period_days)
        queryset = queryset.filter(created_at__gte=since)
    return queryset


def _weekly_series(queryset, date_field: str, weeks: int, today: date) -> list[dict]:
    start = today - timedelta(weeks=weeks - 1)
    start = start - timedelta(days=start.weekday())

    buckets: dict[str, int] = {}
    for i in range(weeks):
        week_start = start + timedelta(weeks=i)
        buckets[week_start.isoformat()] = 0

    trunc = TruncWeek(date_field)
    rows = (
        queryset.filter(**{f"{date_field}__date__gte": start})
        .annotate(week=trunc)
        .values("week")
        .annotate(count=Count("id"))
        .order_by("week")
    )
    for row in rows:
        if row["week"]:
            key = row["week"].date().isoformat()
            if key in buckets:
                buckets[key] = row["count"]

    return [{"week_start": k, "count": v} for k, v in sorted(buckets.items())]


def aggregate_kpis(
    user,
    *,
    period: str = "90d",
    source: str | None = None,
    fase: str | None = None,
    doc_days: int = 30,
) -> dict:
    today = date.today()
    week_end = today + timedelta(days=7)
    organization = user.organization
    period_days = PERIOD_DAYS.get(period) if period != "all" else None

    tenders = Tender.objects.filter(organization=organization)
    filtered_tenders = _apply_tender_filters(
        tenders, source=source, fase=fase, period_days=period_days
    )

    evaluations = TenderEvaluation.objects.filter(tender__organization=organization)
    companies = Company.objects.filter(organization=organization)
    technical_offers = TechnicalOffer.objects.filter(organization=organization)
    relations = TechnicalRelation.objects.filter(tender__organization=organization).select_related(
        "tender", "company"
    )

    has_sections = _relation_with_sections_exists()

    gare_importate_qs = filtered_tenders.exclude(source=Tender.Source.MANUAL)
    gare_analizzate_qs = filtered_tenders.filter(
        Q(ai_extracted=True) | ~Q(fase=Tender.Fase.DA_ANALIZZARE)
    )
    gare_partecipabili_qs = filtered_tenders.filter(fase=Tender.Fase.PARTECIPABILE)

    gare_rti_ids = RTI.objects.filter(organization=organization).values_list("tender_id", flat=True)
    gare_avvalimento_ids = ImpresaAusiliaria.objects.filter(
        organization=organization
    ).values_list("tender_id", flat=True)
    gare_rti_qs = filtered_tenders.filter(id__in=gare_rti_ids)
    gare_avvalimento_qs = filtered_tenders.filter(id__in=gare_avvalimento_ids)

    offerte_in_corso_qs = filtered_tenders.filter(
        stato__in=[Tender.Stato.APERTA, Tender.Stato.BOZZA],
    ).filter(Q(fase=Tender.Fase.OFFERTA) | Exists(has_sections)).distinct()

    offerte_presentate_qs = filtered_tenders.filter(
        stato__in=[Tender.Stato.CHIUSA, Tender.Stato.AGGIUDICATA],
    ).filter(Q(fase=Tender.Fase.OFFERTA) | Exists(has_sections)).distinct()

    expiring_docs = get_expiring_documents(organization, days=doc_days)
    expiring_docs_count = expiring_docs.count()
    expiring_docs_items = [
        {
            "id": doc.id,
            "company_id": doc.company_id,
            "company_name": doc.company.name,
            "original_filename": doc.original_filename,
            "categoria": doc.categoria,
            "categoria_label": doc.get_categoria_display(),
            "data_scadenza": doc.data_scadenza.isoformat() if doc.data_scadenza else None,
            "stato_validita": doc.stato_validita,
            "giorni_alla_scadenza": _giorni_rimanenti(doc.data_scadenza, today)
            if doc.data_scadenza
            else None,
        }
        for doc in expiring_docs[:8]
    ]

    gare_oggi_filter = tenders.filter(
        scadenza=today,
        stato__in=[Tender.Stato.APERTA, Tender.Stato.BOZZA],
    )
    gare_oggi_qs = gare_oggi_filter.order_by("-importo")[:10]
    gare_settimana = tenders.filter(
        scadenza__gt=today,
        scadenza__lte=week_end,
        stato__in=[Tender.Stato.APERTA, Tender.Stato.BOZZA],
    ).count()

    offerta_fase_qs = tenders.filter(fase=Tender.Fase.OFFERTA).order_by("-updated_at")
    offerta_relazioni_qs = relations.exclude(sections=[]).exclude(
        tender__fase=Tender.Fase.OFFERTA
    )
    offerte_items = []
    seen_ids: set[int] = set()

    for tender in offerta_fase_qs[:8]:
        rel = getattr(tender, "technical_relation", None)
        offerte_items.append(
            {
                "tender_id": tender.id,
                "cig": tender.cig,
                "oggetto": tender.oggetto,
                "scadenza": tender.scadenza.isoformat(),
                "company_id": rel.company_id if rel else None,
                "company_name": rel.company.name if rel and rel.company else None,
                "sections_count": len(rel.sections) if rel else 0,
                "tipo": "fase_offerta",
            }
        )
        seen_ids.add(tender.id)

    for rel in offerta_relazioni_qs.order_by("-updated_at"):
        if rel.tender_id in seen_ids or len(offerte_items) >= 10:
            continue
        offerte_items.append(
            {
                "tender_id": rel.tender_id,
                "cig": rel.tender.cig,
                "oggetto": rel.tender.oggetto,
                "scadenza": rel.tender.scadenza.isoformat(),
                "company_id": rel.company_id,
                "company_name": rel.company.name if rel.company else None,
                "sections_count": len(rel.sections),
                "tipo": "relazione_tecnica",
            }
        )
        seen_ids.add(rel.tender_id)

    scouting_qs = tenders.filter(source=Tender.Source.SCOUTING)
    scouting_counts = scouting_qs.aggregate(
        alta=Count("id", filter=Q(priorita=Tender.Priorita.ALTA)),
        media=Count("id", filter=Q(priorita=Tender.Priorita.MEDIA)),
        bassa=Count("id", filter=Q(priorita=Tender.Priorita.BASSA)),
        total=Count("id"),
    )
    scouting_opportunita = list(
        scouting_qs.filter(
            priorita__in=[Tender.Priorita.ALTA, Tender.Priorita.MEDIA],
            stato__in=[Tender.Stato.APERTA, Tender.Stato.BOZZA],
        ).order_by("-priority_score", "scadenza")[:8]
    )

    semaforo_counts = evaluations.aggregate(
        verde=Count("id", filter=Q(semaforo=TenderEvaluation.Semaforo.VERDE)),
        giallo=Count("id", filter=Q(semaforo=TenderEvaluation.Semaforo.GIALLO)),
        rosso=Count("id", filter=Q(semaforo=TenderEvaluation.Semaforo.ROSSO)),
    )
    gare_con_verde = (
        evaluations.filter(semaforo=TenderEvaluation.Semaforo.VERDE)
        .values("tender_id")
        .distinct()
        .count()
    )
    migliori_match = list(
        evaluations.filter(semaforo=TenderEvaluation.Semaforo.VERDE)
        .select_related("tender", "company")
        .order_by("-evaluated_at")[:8]
    )

    ultimo_import = (
        ImportBatch.objects.filter(organization=organization, source=ImportBatch.Source.SCOUTING)
        .order_by("-uploaded_at")
        .values_list("uploaded_at", flat=True)
        .first()
    )

    analizzate_count = gare_analizzate_qs.count()
    partecipabili_count = gare_partecipabili_qs.count()
    in_corso_count = offerte_in_corso_qs.count()
    presentate_count = offerte_presentate_qs.count()

    importo_aperte = (
        filtered_tenders.filter(stato=Tender.Stato.APERTA).aggregate(total=Sum("importo"))["total"]
        or 0
    )
    importo_totale = filtered_tenders.aggregate(total=Sum("importo"))["total"] or 0

    weeks = 12 if period in ("90d", "365d") else 8
    serie_importate = _weekly_series(gare_importate_qs, "created_at", weeks, today)
    serie_analizzate = _weekly_series(
        filtered_tenders.filter(ai_extracted=True, extracted_at__isnull=False),
        "extracted_at",
        weeks,
        today,
    )
    serie_offerte = _weekly_series(offerte_in_corso_qs, "updated_at", weeks, today)

    serie_scadenze = []
    start_week = today - timedelta(days=today.weekday())
    for i in range(weeks):
        week_start = start_week + timedelta(weeks=i)
        week_end = week_start + timedelta(days=7)
        count = tenders.filter(
            scadenza__gte=week_start,
            scadenza__lt=week_end,
            stato__in=[Tender.Stato.APERTA, Tender.Stato.BOZZA],
        ).count()
        serie_scadenze.append({"week_start": week_start.isoformat(), "count": count})

    distribuzione_fasi = {
        row["fase"]: row["count"]
        for row in filtered_tenders.values("fase").annotate(count=Count("id"))
    }
    distribuzione_sorgenti = {
        row["source"]: row["count"]
        for row in filtered_tenders.values("source").annotate(count=Count("id"))
    }

    return {
        "generated_at": today.isoformat(),
        "filters": {
            "period": period,
            "source": source,
            "fase": fase,
            "doc_days": doc_days,
        },
        "indicatori": {
            "gare_importate": gare_importate_qs.count(),
            "gare_analizzate": analizzate_count,
            "gare_partecipabili": partecipabili_count,
            "gare_rti": gare_rti_qs.count(),
            "gare_avvalimento": gare_avvalimento_qs.count(),
            "offerte_in_corso": in_corso_count,
            "offerte_presentate": presentate_count,
            "documenti_in_scadenza": expiring_docs_count,
        },
        "globali": {
            "gare_totali": filtered_tenders.count(),
            "gare_aperte": filtered_tenders.filter(stato=Tender.Stato.APERTA).count(),
            "importo_totale": str(importo_totale),
            "importo_gare_aperte": str(importo_aperte),
            "tasso_analisi": round(analizzate_count / gare_importate_qs.count() * 100, 1)
            if gare_importate_qs.count()
            else 0,
            "tasso_partecipabilita": round(partecipabili_count / analizzate_count * 100, 1)
            if analizzate_count
            else 0,
            "tasso_conversione_offerte": round(
                presentate_count / (in_corso_count + presentate_count) * 100, 1
            )
            if (in_corso_count + presentate_count)
            else 0,
            "match_verdi": semaforo_counts["verde"] or 0,
            "aziende": companies.count(),
        },
        "serie_temporale": {
            "gare_importate": serie_importate,
            "gare_analizzate": serie_analizzate,
            "offerte_in_corso": serie_offerte,
            "scadenze_gare": serie_scadenze,
        },
        "distribuzione": {
            "per_fase": distribuzione_fasi,
            "per_sorgente": distribuzione_sorgenti,
        },
        "documenti": {
            "in_scadenza": expiring_docs_count,
            "items": expiring_docs_items,
        },
        "gare": {
            "total": tenders.count(),
            "aperte": tenders.filter(stato=Tender.Stato.APERTA).count(),
            "scadenza_oggi": gare_oggi_filter.count(),
            "scadenza_settimana": gare_settimana,
            "oggi": [
                {**_tender_brief(t), "giorni_rimanenti": _giorni_rimanenti(t.scadenza, today)}
                for t in gare_oggi_qs
            ],
        },
        "offerte": {
            "in_corso": in_corso_count,
            "presentate": presentate_count,
            "fase_offerta": offerta_fase_qs.count(),
            "relazioni_tecniche": offerta_relazioni_qs.count(),
            "libreria": technical_offers.count(),
            "items": offerte_items,
        },
        "scouting": {
            **scouting_counts,
            "ultimo_import": ultimo_import.isoformat() if ultimo_import else None,
            "opportunita": [_tender_brief(t) for t in scouting_opportunita],
        },
        "compatibilita": {
            "aziende": companies.count(),
            "valutazioni": evaluations.count(),
            "gare_valutate": evaluations.values("tender_id").distinct().count(),
            "gare_con_verde": gare_con_verde,
            "semaforo": semaforo_counts,
            "migliori_match": [
                {
                    "tender_id": ev.tender_id,
                    "cig": ev.tender.cig,
                    "oggetto": ev.tender.oggetto,
                    "company_id": ev.company_id,
                    "company_name": ev.company.name,
                    "semaforo": ev.semaforo,
                    "motivazione": ev.motivazione[:200],
                }
                for ev in migliori_match
            ],
        },
    }
