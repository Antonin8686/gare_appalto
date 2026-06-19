export type AnalysisStatus =
  | "completata"
  | "in_analisi"
  | "documenti_in_elaborazione"
  | "errore_documenti"
  | "in_attesa";

export interface AnalysisHubDocumentStats {
  total: number;
  done: number;
  processing: number;
  failed: number;
}

export interface AnalysisHubRequirementStats {
  total: number;
  generale: number;
  economico_finanziario: number;
  tecnico_professionale: number;
  certificazione: number;
  idoneita_professionale: number;
}

export interface AnalysisHubItem {
  id: number;
  cig: string;
  oggetto: string;
  cpv: string;
  importo: string;
  scadenza: string;
  stato: string;
  fase: string;
  source: string;
  priorita: string;
  priority_score: number;
  import_filename: string | null;
  imported_at: string | null;
  analysis_status: AnalysisStatus;
  analysis_status_label: string;
  ai_extracted: boolean;
  extracted_at: string | null;
  documents: AnalysisHubDocumentStats;
  requirements: AnalysisHubRequirementStats;
  criteria_count: number;
  required_documents_count: number;
  scheda_ready: boolean;
  regione?: string;
  provincia?: string;
  stazione_appaltante: string;
}

export interface AnalysisHubFacets {
  regioni: string[];
  province: string[];
  fasi: string[];
}

export interface AnalysisHubSummary {
  total: number;
  completate: number;
  in_analisi: number;
  in_attesa: number;
  documenti_in_elaborazione: number;
  errore_documenti: number;
  con_documenti: number;
  con_requisiti: number;
  con_criteri: number;
}

export interface AnalysisHubResponse {
  summary: AnalysisHubSummary;
  by_status: Record<AnalysisStatus, number>;
  facets?: AnalysisHubFacets;
  items: AnalysisHubItem[];
}

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  completata: "Completata",
  in_analisi: "In analisi",
  documenti_in_elaborazione: "Documenti in elaborazione",
  errore_documenti: "Errore documenti",
  in_attesa: "In attesa documenti",
};

export const ANALYSIS_STATUS_OPTIONS: { value: AnalysisStatus | "all"; label: string }[] = [
  { value: "all", label: "Tutti gli stati" },
  { value: "in_attesa", label: "In attesa documenti" },
  { value: "documenti_in_elaborazione", label: "Documenti in elaborazione" },
  { value: "in_analisi", label: "In analisi" },
  { value: "completata", label: "Completata" },
  { value: "errore_documenti", label: "Errore documenti" },
];
