export interface TenderDocument {
  id: number;
  name: string;
  doc_type: "disciplinare" | "capitolato" | "allegato" | "modulo" | "altro";
  original_filename: string;
  content_type: string;
  file_size: number;
  status: "processing" | "done" | "failed";
  text_content: string;
  error_message: string;
  validation_issues: string[];
  uploaded_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<TenderDocument["doc_type"], string> = {
  disciplinare: "Disciplinare",
  capitolato: "Capitolato",
  allegato: "Allegato",
  modulo: "Modulo / modello",
  altro: "Altro",
};

export const DOCUMENT_STATUS_LABELS: Record<TenderDocument["status"], string> = {
  processing: "In elaborazione",
  done: "Completato",
  failed: "Errore",
};

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
] as const;

export const ALLOWED_DOCUMENT_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
].join(",");
