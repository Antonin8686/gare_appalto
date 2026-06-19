SCHEDA_GARA = "scheda_gara"
MATRICE_REQUISITI = "matrice_requisiti"
REPORT_PARTECIPABILITA = "report_partecipabilita"
RELAZIONE_TECNICA = "relazione_tecnica"
OFFERTA_ECONOMICA = "offerta_economica"

EXPORT_ITEMS = (
    SCHEDA_GARA,
    MATRICE_REQUISITI,
    REPORT_PARTECIPABILITA,
    RELAZIONE_TECNICA,
    OFFERTA_ECONOMICA,
)

EXPORT_ITEM_LABELS = {
    SCHEDA_GARA: "Scheda gara",
    MATRICE_REQUISITI: "Matrice requisiti",
    REPORT_PARTECIPABILITA: "Report partecipabilità",
    RELAZIONE_TECNICA: "Relazione tecnica",
    OFFERTA_ECONOMICA: "Offerta economica",
}

FORMAT_DOCX = "docx"
FORMAT_PDF = "pdf"
FORMAT_XLSX = "xlsx"

EXPORT_FORMATS = (FORMAT_DOCX, FORMAT_PDF, FORMAT_XLSX)

MIME_TYPES = {
    FORMAT_DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    FORMAT_PDF: "application/pdf",
    FORMAT_XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "zip": "application/zip",
}

FILE_EXTENSIONS = {
    FORMAT_DOCX: "docx",
    FORMAT_PDF: "pdf",
    FORMAT_XLSX: "xlsx",
}

ITEM_FILE_SLUGS = {
    SCHEDA_GARA: "scheda-gara",
    MATRICE_REQUISITI: "matrice-requisiti",
    REPORT_PARTECIPABILITA: "report-partecipabilita",
    RELAZIONE_TECNICA: "relazione-tecnica",
    OFFERTA_ECONOMICA: "offerta-economica",
}
