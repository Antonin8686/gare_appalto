from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass

from .collector import TenderExportContext, collect_export_context
from .constants import (
    EXPORT_FORMATS,
    EXPORT_ITEM_LABELS,
    EXPORT_ITEMS,
    FILE_EXTENSIONS,
    FORMAT_DOCX,
    FORMAT_PDF,
    FORMAT_XLSX,
    ITEM_FILE_SLUGS,
    MIME_TYPES,
)
from .docx_export import build_docx_export
from .pdf_export import build_pdf_export
from .xlsx_export import build_xlsx_export


class ExportError(Exception):
    pass


@dataclass(frozen=True)
class ExportFile:
    filename: str
    content: bytes
    content_type: str


def _build_item(item: str, fmt: str, ctx: TenderExportContext) -> ExportFile:
    cig = ctx.tender.cig
    slug = ITEM_FILE_SLUGS[item]
    extension = FILE_EXTENSIONS[fmt]

    if fmt == FORMAT_DOCX:
        content = build_docx_export(item, ctx)
    elif fmt == FORMAT_XLSX:
        content = build_xlsx_export(item, ctx)
    elif fmt == FORMAT_PDF:
        content = build_pdf_export(item, ctx)
    else:
        raise ExportError(f"Formato non supportato: {fmt}")

    return ExportFile(
        filename=f"gara-{cig}-{slug}.{extension}",
        content=content,
        content_type=MIME_TYPES[fmt],
    )


def _zip_files(files: list[ExportFile], archive_name: str) -> ExportFile:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for export_file in files:
            archive.writestr(export_file.filename, export_file.content)
    return ExportFile(
        filename=archive_name,
        content=buffer.getvalue(),
        content_type=MIME_TYPES["zip"],
    )


def export_tender_documents(
    tender,
    user,
    *,
    items: list[str],
    fmt: str,
    participation_params: dict | None = None,
    matrix_company_ids: list[int] | None = None,
) -> ExportFile:
    if fmt not in EXPORT_FORMATS:
        raise ExportError(f"Formato non valido: {fmt}")

    normalized_items = [item for item in items if item in EXPORT_ITEMS]
    if not normalized_items:
        raise ExportError("Selezionare almeno un documento da esportare.")

    ctx = collect_export_context(
        tender,
        user,
        participation_params=participation_params,
        matrix_company_ids=matrix_company_ids,
    )

    built = [_build_item(item, fmt, ctx) for item in normalized_items]
    if len(built) == 1:
        return built[0]

    cig = ctx.tender.cig
    return _zip_files(built, f"fascicolo-gara-{cig}.zip")


def export_full_bundle(
    tender,
    user,
    *,
    fmt: str,
    participation_params: dict | None = None,
    matrix_company_ids: list[int] | None = None,
) -> ExportFile:
    return export_tender_documents(
        tender,
        user,
        items=list(EXPORT_ITEMS),
        fmt=fmt,
        participation_params=participation_params,
        matrix_company_ids=matrix_company_ids,
    )


def list_export_options() -> dict:
    return {
        "items": [
            {"id": item, "label": EXPORT_ITEM_LABELS[item]}
            for item in EXPORT_ITEMS
        ],
        "formats": list(EXPORT_FORMATS),
        "compatibility": {
            "docx": "Microsoft Word, LibreOffice Writer",
            "xlsx": "Microsoft Excel, LibreOffice Calc",
            "pdf": "Lettori PDF standard (Adobe, Edge, LibreOffice Draw)",
        },
    }
