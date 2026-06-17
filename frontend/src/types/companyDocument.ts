export type CompanyDocumentCategoria =
  | "durc"
  | "visura_camerale"
  | "certificazione_iso"
  | "bilancio"
  | "polizza"
  | "dichiarazione"
  | "personalizzato";

export type CompanyDocumentStatoValidita =
  | "valido"
  | "in_scadenza"
  | "scaduto"
  | "senza_scadenza";

export interface CompanyDocument {
  id: number;
  categoria: CompanyDocumentCategoria;
  original_filename: string;
  content_type: string;
  file_size: number;
  data_rilascio: string | null;
  data_scadenza: string | null;
  note: string;
  stato_validita: CompanyDocumentStatoValidita;
  giorni_alla_scadenza: number | null;
  uploaded_at: string;
  updated_at: string;
}

export interface CompanyDocumentUploadPayload {
  file: File;
  categoria: CompanyDocumentCategoria;
  data_rilascio?: string | null;
  data_scadenza?: string | null;
  note?: string;
}

export interface CompanyDocumentFilters {
  q?: string;
  categoria?: CompanyDocumentCategoria | "";
  stato_validita?: CompanyDocumentStatoValidita | "";
}

export interface CompanyDocumentExpiringItem extends CompanyDocument {
  company_id: number;
  company_name: string;
  categoria_label: string;
  stato_validita_label: string;
}

export interface CompanyDocumentsExpiringResponse {
  days: number;
  count: number;
  documents: CompanyDocumentExpiringItem[];
}

export const COMPANY_DOCUMENT_CATEGORIE: {
  value: CompanyDocumentCategoria;
  label: string;
}[] = [
  { value: "durc", label: "DURC" },
  { value: "visura_camerale", label: "Visura Camerale" },
  { value: "certificazione_iso", label: "Certificazione ISO" },
  { value: "bilancio", label: "Bilancio" },
  { value: "polizza", label: "Polizza" },
  { value: "dichiarazione", label: "Dichiarazione" },
  { value: "personalizzato", label: "Documento Personalizzato" },
];

export const COMPANY_DOCUMENT_CATEGORIA_LABELS: Record<CompanyDocumentCategoria, string> =
  Object.fromEntries(
    COMPANY_DOCUMENT_CATEGORIE.map((item) => [item.value, item.label]),
  ) as Record<CompanyDocumentCategoria, string>;

export const COMPANY_DOCUMENT_STATO_LABELS: Record<CompanyDocumentStatoValidita, string> = {
  valido: "Valido",
  in_scadenza: "In scadenza",
  scaduto: "Scaduto",
  senza_scadenza: "Senza scadenza",
};

export const ALLOWED_COMPANY_DOCUMENT_EXTENSIONS = [
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

export const ALLOWED_COMPANY_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp";
