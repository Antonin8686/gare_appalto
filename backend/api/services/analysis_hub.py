from django.db.models import Count

from tenders.models import Document, EvaluationCriterion, Requirement, Tender
from tenders.services.italian_regions import resolve_regione_provincia


ANALYSIS_STATUS_LABELS = {
    "completata": "Completata",
    "in_analisi": "In analisi",
    "documenti_in_elaborazione": "Documenti in elaborazione",
    "errore_documenti": "Errore documenti",
    "in_attesa": "In attesa documenti",
}


def _compute_analysis_status(
    *,
    ai_extracted: bool,
    docs_total: int,
    docs_done: int,
    docs_processing: int,
    docs_failed: int,
) -> str:
    if ai_extracted:
        return "completata"
    if docs_processing > 0:
        return "documenti_in_elaborazione"
    if docs_done > 0:
        return "in_analisi"
    if docs_total > 0 and docs_failed == docs_total:
        return "errore_documenti"
    return "in_attesa"


def _count_required_documents(formal_rules: dict | None) -> int:
    if not isinstance(formal_rules, dict):
        return 0
    allegati = formal_rules.get("allegati", [])
    if not isinstance(allegati, list):
        return 0
    return len(allegati)


def aggregate_analysis_hub(user, *, source: str | None = None, priorita: str | None = None) -> dict:
    organization = user.organization
    tenders = (
        Tender.objects.filter(organization=organization)
        .exclude(source=Tender.Source.MANUAL)
        .select_related("import_batch")
        .prefetch_related("documents")
    )

    if source:
        sources = [item.strip() for item in source.split(",") if item.strip()]
        tenders = tenders.filter(source__in=sources)

    if priorita:
        priorita_values = [item.strip() for item in priorita.split(",") if item.strip()]
        tenders = tenders.filter(priorita__in=priorita_values)

    tender_ids = list(tenders.values_list("id", flat=True))

    req_counts: dict[int, dict[str, int]] = {}
    for row in (
        Requirement.objects.filter(tender_id__in=tender_ids)
        .values("tender_id", "categoria")
        .annotate(count=Count("id"))
    ):
        tid = row["tender_id"]
        if tid not in req_counts:
            req_counts[tid] = {}
        req_counts[tid][row["categoria"]] = row["count"]

    criteria_counts = dict(
        EvaluationCriterion.objects.filter(tender_id__in=tender_ids)
        .values("tender_id")
        .annotate(count=Count("id"))
        .values_list("tender_id", "count")
    )

    doc_stats: dict[int, dict[str, int]] = {}
    for row in (
        Document.objects.filter(tender_id__in=tender_ids)
        .values("tender_id", "status")
        .annotate(count=Count("id"))
    ):
        tid = row["tender_id"]
        if tid not in doc_stats:
            doc_stats[tid] = {"total": 0, "done": 0, "processing": 0, "failed": 0}
        doc_stats[tid]["total"] += row["count"]
        if row["status"] == Document.Status.DONE:
            doc_stats[tid]["done"] += row["count"]
        elif row["status"] == Document.Status.PROCESSING:
            doc_stats[tid]["processing"] += row["count"]
        elif row["status"] == Document.Status.FAILED:
            doc_stats[tid]["failed"] += row["count"]

    items = []
    status_summary: dict[str, int] = {key: 0 for key in ANALYSIS_STATUS_LABELS}
    regioni_set: set[str] = set()
    province_set: set[str] = set()
    fasi_set: set[str] = set()

    for tender in tenders.order_by("-priority_score", "scadenza"):
        stats = doc_stats.get(tender.id, {"total": 0, "done": 0, "processing": 0, "failed": 0})
        reqs = req_counts.get(tender.id, {})
        req_total = sum(reqs.values())
        criteria_total = criteria_counts.get(tender.id, 0)
        required_docs = _count_required_documents(tender.formal_rules)

        provincia, regione = resolve_regione_provincia(
            provincia=tender.provincia,
            regione=tender.regione,
            stazione_appaltante=tender.stazione_appaltante,
            zona=tender.zona,
            oggetto=tender.oggetto,
        )
        if regione:
            regioni_set.add(regione)
        if provincia:
            province_set.add(provincia)
        if tender.fase:
            fasi_set.add(tender.fase)

        analysis_status = _compute_analysis_status(
            ai_extracted=tender.ai_extracted,
            docs_total=stats["total"],
            docs_done=stats["done"],
            docs_processing=stats["processing"],
            docs_failed=stats["failed"],
        )
        status_summary[analysis_status] = status_summary.get(analysis_status, 0) + 1

        items.append(
            {
                "id": tender.id,
                "cig": tender.cig,
                "oggetto": tender.oggetto,
                "cpv": tender.cpv,
                "importo": str(tender.importo),
                "scadenza": tender.scadenza.isoformat(),
                "stato": tender.stato,
                "fase": tender.fase,
                "regione": regione,
                "provincia": provincia,
                "zona": tender.zona,
                "stazione_appaltante": tender.stazione_appaltante,
                "source": tender.source,
                "priorita": tender.priorita,
                "priority_score": tender.priority_score,
                "import_filename": (
                    tender.import_batch.original_filename if tender.import_batch_id else None
                ),
                "imported_at": (
                    tender.import_batch.uploaded_at.isoformat() if tender.import_batch_id else None
                ),
                "analysis_status": analysis_status,
                "analysis_status_label": ANALYSIS_STATUS_LABELS[analysis_status],
                "ai_extracted": tender.ai_extracted,
                "extracted_at": tender.extracted_at.isoformat() if tender.extracted_at else None,
                "documents": {
                    "total": stats["total"],
                    "done": stats["done"],
                    "processing": stats["processing"],
                    "failed": stats["failed"],
                },
                "requirements": {
                    "total": req_total,
                    "generale": reqs.get(Requirement.Categoria.GENERALE, 0),
                    "economico_finanziario": reqs.get(Requirement.Categoria.ECONOMICO_FINANZIARIO, 0),
                    "tecnico_professionale": reqs.get(Requirement.Categoria.TECNICO_PROFESSIONALE, 0),
                    "certificazione": reqs.get(Requirement.Categoria.CERTIFICAZIONE, 0),
                    "idoneita_professionale": reqs.get(
                        Requirement.Categoria.IDONEITA_PROFESSIONALE, 0
                    ),
                },
                "criteria_count": criteria_total,
                "required_documents_count": required_docs,
                "scheda_ready": bool(tender.scheda) and bool(tender.scheda_generated_at),
                "has_scheda": bool(tender.scheda) and bool(tender.scheda_generated_at),
            }
        )

    return {
        "summary": {
            "total": len(items),
            "completate": status_summary.get("completata", 0),
            "in_analisi": status_summary.get("in_analisi", 0),
            "in_attesa": status_summary.get("in_attesa", 0),
            "documenti_in_elaborazione": status_summary.get("documenti_in_elaborazione", 0),
            "errore_documenti": status_summary.get("errore_documenti", 0),
            "con_documenti": sum(1 for item in items if item["documents"]["total"] > 0),
            "con_requisiti": sum(1 for item in items if item["requirements"]["total"] > 0),
            "con_criteri": sum(1 for item in items if item["criteria_count"] > 0),
        },
        "by_status": status_summary,
        "facets": {
            "regioni": sorted(regioni_set),
            "province": sorted(province_set),
            "fasi": sorted(fasi_set),
        },
        "items": items,
    }
