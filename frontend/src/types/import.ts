export type ImportStatus = "processing" | "done" | "failed";

export type ImportSource = "scouting" | "telemat";

export interface ImportBatch {
  id: number;
  source: ImportSource;
  original_filename: string;
  content_type: string;
  file_size: number;
  status: ImportStatus;
  tenders_created: number;
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
