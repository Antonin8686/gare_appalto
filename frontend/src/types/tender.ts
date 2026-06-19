import type { FormalRules } from "./tenderFormalRules";

export type TenderPriorita = "alta" | "media" | "bassa";

export type TenderStato = "bozza" | "aperta" | "chiusa" | "aggiudicata";

export type TenderFase =
  | "da_analizzare"
  | "in_corso"
  | "partecipabile"
  | "esclusa"
  | "offerta";

export type TenderSource = "manual" | "scouting" | "telemat" | "welfare";

export interface Tender {
  id: number;
  cig: string;
  cpv: string;
  importo: string;
  scadenza: string;
  stato: TenderStato;
  fase: TenderFase;
  source: TenderSource;
  oggetto: string;
  import_batch_id: number | null;
  import_filename: string | null;
  imported_at: string | null;
  ai_extracted: boolean;
  extracted_at: string | null;
  formal_rules: FormalRules;
  priorita: TenderPriorita;
  priority_score: number;
  created_at: string;
  updated_at: string;
}

export interface TenderPayload {
  cig: string;
  cpv: string;
  importo: string;
  scadenza: string;
  stato: TenderStato;
}

export interface TenderPatchPayload {
  formal_rules?: FormalRules;
  fase?: TenderFase;
}

export const TENDER_STATI: { value: TenderStato; label: string }[] = [
  { value: "bozza", label: "Bozza" },
  { value: "aperta", label: "Aperta" },
  { value: "chiusa", label: "Chiusa" },
  { value: "aggiudicata", label: "Aggiudicata" },
];

export const TENDER_STATO_LABELS: Record<TenderStato, string> = {
  bozza: "Bozza",
  aperta: "Aperta",
  chiusa: "Chiusa",
  aggiudicata: "Aggiudicata",
};

export const TENDER_FASI: { value: TenderFase; label: string }[] = [
  { value: "da_analizzare", label: "Da analizzare" },
  { value: "in_corso", label: "In corso" },
  { value: "partecipabile", label: "Partecipabile" },
  { value: "esclusa", label: "Esclusa" },
  { value: "offerta", label: "Offerta" },
];

export const TENDER_FASE_LABELS: Record<TenderFase, string> = {
  da_analizzare: "Da analizzare",
  in_corso: "In corso",
  partecipabile: "Partecipabile",
  esclusa: "Esclusa",
  offerta: "Offerta",
};

export const TENDER_SOURCE_LABELS: Record<TenderSource, string> = {
  manual: "Manuale",
  scouting: "Scouting",
  telemat: "Telemat",
  welfare: "Welfare",
};

export const TENDER_PRIORITA_LABELS: Record<TenderPriorita, string> = {
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
};

export const TENDER_PRIORITA_OPTIONS: { value: TenderPriorita | "all"; label: string }[] = [
  { value: "all", label: "Tutte" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "bassa", label: "Bassa" },
];
