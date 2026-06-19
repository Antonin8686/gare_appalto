from __future__ import annotations

from ..models import ImportBatch, Tender, TenderImportSnapshot
from .import_parser import ParsedTenderRow
from .italian_regions import resolve_regione_provincia
from .scoring import apply_scoring_to_tender


def _apply_location_fields(tender: Tender, row: ParsedTenderRow) -> None:
    if row.zona:
        tender.zona = row.zona[:255]
    provincia, regione = resolve_regione_provincia(
        provincia=row.provincia or tender.provincia,
        regione=row.regione or tender.regione,
        stazione_appaltante=row.stazione_appaltante or tender.stazione_appaltante,
        zona=row.zona or tender.zona,
        oggetto=row.oggetto or tender.oggetto,
    )
    tender.provincia = provincia
    tender.regione = regione


def _snapshot_from_row(tender: Tender, batch: ImportBatch, row: ParsedTenderRow) -> TenderImportSnapshot:
    provincia, regione = resolve_regione_provincia(
        provincia=row.provincia or tender.provincia,
        regione=row.regione or tender.regione,
        stazione_appaltante=row.stazione_appaltante or tender.stazione_appaltante,
        zona=row.zona or tender.zona,
        oggetto=row.oggetto or tender.oggetto,
    )
    return TenderImportSnapshot(
        tender=tender,
        import_batch=batch,
        cig=row.cig,
        cpv=row.cpv,
        importo=row.importo,
        scadenza=row.scadenza,
        stato=row.stato,
        oggetto=row.oggetto,
        stazione_appaltante=row.stazione_appaltante,
        zona=(row.zona or tender.zona)[:255],
        provincia=provincia,
        regione=regione,
        durata=row.durata,
        document_url=row.document_url,
    )


def _apply_row_to_tender(tender: Tender, batch: ImportBatch, row: ParsedTenderRow) -> None:
    tender.cpv = row.cpv or tender.cpv
    tender.importo = row.importo or tender.importo
    tender.scadenza = row.scadenza
    tender.stato = row.stato
    tender.oggetto = row.oggetto or tender.oggetto
    tender.stazione_appaltante = row.stazione_appaltante or tender.stazione_appaltante
    tender.durata = row.durata or tender.durata
    if row.document_url:
        tender.document_url = row.document_url
    _apply_location_fields(tender, row)
    tender.source = batch.source
    tender.import_batch = batch


def upsert_tenders_from_import(batch: ImportBatch, rows: list[ParsedTenderRow]) -> dict:
    """Crea o aggiorna gare e conserva uno snapshot per ogni rilevazione."""
    cigs = [row.cig for row in rows]
    existing = {
        t.cig: t
        for t in Tender.objects.filter(organization=batch.organization, cig__in=cigs)
    }

    created = 0
    updated = 0
    snapshots: list[TenderImportSnapshot] = []
    download_ids: list[int] = []

    for row in rows:
        tender = existing.get(row.cig)
        if tender:
            _apply_row_to_tender(tender, batch, row)
            tender.save()
            updated += 1
        else:
            tender = Tender(
                owner=batch.owner,
                organization=batch.organization,
                cig=row.cig,
                cpv=row.cpv,
                importo=row.importo,
                scadenza=row.scadenza,
                stato=row.stato,
                oggetto=row.oggetto,
                stazione_appaltante=row.stazione_appaltante,
                durata=row.durata,
                document_url=row.document_url,
                source=batch.source,
                import_batch=batch,
            )
            _apply_location_fields(tender, row)
            tender.save()
            existing[row.cig] = tender
            created += 1

        snapshots.append(_snapshot_from_row(tender, batch, row))
        if row.document_url or tender.document_url:
            download_ids.append(tender.id)

        apply_scoring_to_tender(tender)

    TenderImportSnapshot.objects.bulk_create(snapshots)

    return {
        "created": created,
        "updated": updated,
        "snapshots": len(snapshots),
        "download_ids": download_ids,
    }
