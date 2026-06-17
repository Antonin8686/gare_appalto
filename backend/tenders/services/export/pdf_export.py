from __future__ import annotations

import io
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .constants import (
    MATRICE_REQUISITI,
    RELAZIONE_TECNICA,
    REPORT_PARTECIPABILITA,
    SCHEDA_GARA,
)
from .collector import TenderExportContext


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ExportTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "ExportSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=16,
        ),
        "heading": ParagraphStyle(
            "ExportHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "ExportBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
        ),
        "footer": ParagraphStyle(
            "ExportFooter",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            textColor=colors.HexColor("#94A3B8"),
            alignment=2,
        ),
    }


def _escape(text: str) -> str:
    return (
        str(text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _build_pdf(elements: list) -> bytes:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Export gara",
    )
    document.build(elements)
    return buffer.getvalue()


def _table_style(header_rows: int = 1) -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, header_rows - 1), colors.HexColor("#1E3A5F")),
            ("TEXTCOLOR", (0, 0), (-1, header_rows - 1), colors.white),
            ("FONTNAME", (0, 0), (-1, header_rows - 1), "Helvetica-Bold"),
            ("FONTNAME", (0, header_rows), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, header_rows), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ]
    )


def export_scheda_pdf(ctx: TenderExportContext) -> bytes:
    styles = _styles()
    scheda = ctx.scheda
    story = [
        Paragraph("Scheda gara d'appalto", styles["title"]),
        Paragraph(
            f"CIG {_escape(scheda['cig'])} · {_escape(scheda.get('organization', ''))}",
            styles["subtitle"],
        ),
    ]
    rows = [
        ["Campo", "Valore"],
        ["CIG", scheda["cig"]],
        ["CPV", scheda["cpv"]],
        ["Oggetto", scheda.get("oggetto", "")],
        ["Importo", f"€ {scheda['importo']}"],
        ["Scadenza", scheda["scadenza"]],
        ["Stato", scheda["stato"]],
        ["Fase", scheda["fase"]],
        ["Priorità", scheda["priorita"]],
    ]
    table = Table(rows, colWidths=[4 * cm, 12 * cm])
    table.setStyle(_table_style())
    story.extend([table, Spacer(1, 12), Paragraph(f"Generato il {ctx.exported_at}", styles["footer"])])
    return _build_pdf(story)


def export_matrix_pdf(ctx: TenderExportContext) -> bytes:
    styles = _styles()
    matrix = ctx.matrix
    story = [
        Paragraph("Matrice requisiti aziende", styles["title"]),
        Paragraph(f"Gara CIG {_escape(matrix.tender_cig)}", styles["subtitle"]),
    ]

    if not matrix.companies:
        story.append(Paragraph("Nessuna azienda configurata.", styles["body"]))
        return _build_pdf(story)

    headers = ["Requisito", "Categoria"] + [company["name"][:20] for company in matrix.companies]
    rows = [headers]
    for requirement in matrix.requirements[:40]:
        row = [
            requirement.descrizione[:120],
            requirement.categoria_label,
        ]
        for cell in requirement.cells:
            row.append(cell.esito_label)
        rows.append(row)

    table = Table(rows, repeatRows=1)
    table.setStyle(_table_style())
    story.extend(
        [
            table,
            Spacer(1, 8),
            Paragraph(
                _escape(
                    f"Riepilogo: {matrix.summary.get('soddisfatto', 0)} soddisfatti · "
                    f"{matrix.summary.get('parzialmente', 0)} parziali · "
                    f"{matrix.summary.get('non_soddisfatto', 0)} non soddisfatti"
                ),
                styles["body"],
            ),
            Paragraph(f"Generato il {ctx.exported_at}", styles["footer"]),
        ]
    )
    return _build_pdf(story)


def export_participation_pdf(ctx: TenderExportContext) -> bytes:
    styles = _styles()
    analysis = ctx.participation
    copertura = analysis.copertura
    story = [
        Paragraph("Report partecipabilità", styles["title"]),
        Paragraph(
            f"Gara CIG {_escape(ctx.tender.cig)} · {_escape(analysis.forma_label)}",
            styles["subtitle"],
        ),
        Paragraph(
            _escape(
                f"Copertura: {copertura.percentuale:.1f}% "
                f"({copertura.soddisfatti}/{copertura.totale} soddisfatti)"
            ),
            styles["body"],
        ),
        Spacer(1, 8),
    ]

    rows = [["Requisito", "Esito", "Azienda", "Motivazione"]]
    for req in analysis.requisiti[:50]:
        rows.append(
            [
                req.descrizione[:100],
                req.esito_label,
                req.company_name or "—",
                req.motivazione[:120],
            ]
        )
    table = Table(rows, repeatRows=1)
    table.setStyle(_table_style())
    story.extend([table, Spacer(1, 8), Paragraph(f"Generato il {ctx.exported_at}", styles["footer"])])
    return _build_pdf(story)


def export_relation_pdf(ctx: TenderExportContext) -> bytes:
    styles = _styles()
    relation = ctx.relation
    story = [
        Paragraph("Relazione tecnica", styles["title"]),
        Paragraph(
            f"Gara CIG {_escape(ctx.tender.cig)} · Azienda: "
            f"{_escape(relation.get('company_name') or '—')}",
            styles["subtitle"],
        ),
    ]

    sections = sorted(relation.get("sections") or [], key=lambda item: item.get("order", 0))
    if not sections:
        story.append(Paragraph("Nessuna sezione compilata.", styles["body"]))
    else:
        for section in sections:
            story.append(Paragraph(_escape(section.get("title", "Sezione")), styles["heading"]))
            content = re.sub(r"^#+\s*", "", section.get("content", ""), flags=re.MULTILINE)
            for block in content.split("\n\n"):
                if block.strip():
                    story.append(Paragraph(_escape(block.strip()), styles["body"]))
            story.append(Spacer(1, 6))

    story.append(Paragraph(f"Generato il {ctx.exported_at}", styles["footer"]))
    return _build_pdf(story)


def build_pdf_export(item: str, ctx: TenderExportContext) -> bytes:
    builders = {
        SCHEDA_GARA: export_scheda_pdf,
        MATRICE_REQUISITI: export_matrix_pdf,
        REPORT_PARTECIPABILITA: export_participation_pdf,
        RELAZIONE_TECNICA: export_relation_pdf,
    }
    return builders[item](ctx)
