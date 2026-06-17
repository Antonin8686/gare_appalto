export type TenderExportFormat = "docx" | "pdf" | "xlsx";

export type TenderExportItem =
  | "scheda_gara"
  | "matrice_requisiti"
  | "report_partecipabilita"
  | "relazione_tecnica";

export const TENDER_EXPORT_ITEM_LABELS: Record<TenderExportItem, string> = {
  scheda_gara: "Scheda gara",
  matrice_requisiti: "Matrice requisiti",
  report_partecipabilita: "Report partecipabilità",
  relazione_tecnica: "Relazione tecnica",
};

export const TENDER_EXPORT_FORMAT_LABELS: Record<TenderExportFormat, string> = {
  docx: "Word (DOCX)",
  pdf: "PDF",
  xlsx: "Excel (XLSX)",
};

export interface TenderExportOptions {
  items: Array<{ id: TenderExportItem; label: string }>;
  formats: TenderExportFormat[];
  compatibility: Record<TenderExportFormat, string>;
}

export interface TenderExportParticipationParams {
  forma?: "singola" | "rti" | "consorzio" | "avvalimento";
  company_ids?: number[];
  ripartizione_requisiti?: Record<string, number>;
  avvalimenti?: Array<Record<string, unknown>>;
}

export interface TenderExportRequest {
  items?: TenderExportItem[];
  format: TenderExportFormat;
  bundle?: boolean;
  matrix_company_ids?: number[];
  participation?: TenderExportParticipationParams;
}
