export type ImportStatus = "processing" | "done" | "failed";

export type ImportSource = "scouting" | "telemat" | "welfare";

export interface ImportBatch {
  id: number;
  source: ImportSource;
  original_filename: string;
  content_type: string;
  file_size: number;
  status: ImportStatus;
  tenders_created: number;
  tenders_updated: number;
  error_message: string;
  uploaded_at: string;
}

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  processing: "In elaborazione",
  done: "Completato",
  failed: "Errore",
};

export const ALLOWED_IMPORT_EXTENSIONS = [".csv", ".xls", ".xlsx"] as const;

export const ALLOWED_IMPORT_ACCEPT =
  ".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export const TELEMAT_IMPORT_EXTENSIONS = [".csv", ".xls", ".xlsx", ".pdf"] as const;

export const TELEMAT_IMPORT_ACCEPT =
  ".csv,.xls,.xlsx,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/pdf";
