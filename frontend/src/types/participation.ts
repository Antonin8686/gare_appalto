export type ParticipationForma = "singola" | "rti" | "consorzio" | "avvalimento";

export type CoverageEsito = "soddisfatto" | "parzialmente" | "non_soddisfatto";

export interface RTIMember {
  id?: number;
  company_id: number;
  company_name?: string;
  ruolo: "mandataria" | "mandante";
  ruolo_label?: string;
  quota_partecipazione: string;
  quota_esecuzione: string;
}

export interface RTI {
  id: number;
  tender: number;
  mandataria_id: number;
  mandataria_name: string;
  nome: string;
  note: string;
  ripartizione_requisiti: Record<string, number>;
  members: RTIMember[];
  created_at: string;
  updated_at: string;
}

export interface RTIPayload {
  mandataria_id: number;
  nome?: string;
  note?: string;
  ripartizione_requisiti?: Record<string, number>;
  members?: Omit<RTIMember, "id" | "company_name" | "ruolo_label">[];
}

export interface ConsorzioMandante {
  company_id: number;
  quota_partecipazione: number;
  quota_esecuzione: number;
}

export interface Consorzio {
  id: number;
  tender: number;
  mandataria_id: number;
  mandataria_name: string;
  nome: string;
  note: string;
  mandanti: ConsorzioMandante[];
  ripartizione_requisiti: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface ImpresaAusiliaria {
  id: number;
  tender: number;
  impresa_principale_id: number;
  impresa_principale_name: string;
  impresa_ausiliaria_id: number;
  impresa_ausiliaria_name: string;
  requisiti_coperti: number[];
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CoverageSummary {
  totale: number;
  soddisfatti: number;
  parziali: number;
  non_soddisfatti: number;
  percentuale: number;
}

export interface RequirementCoverage {
  requirement_id: number;
  descrizione: string;
  tipo: string;
  categoria: string;
  esito: CoverageEsito;
  esito_label: string;
  semaforo: "verde" | "giallo" | "rosso";
  company_id: number | null;
  company_name: string | null;
  valore_posseduto: string;
  valore_richiesto: string;
  motivazione: string;
  critico: boolean;
}

export interface ParticipationCriticita {
  requirement_id: number;
  descrizione: string;
  esito: CoverageEsito;
  esito_label: string;
  motivazione: string;
  company_name: string | null;
  severita: "alta" | "media" | "bassa";
}

export interface ParticipationAnalysis {
  forma: ParticipationForma;
  forma_label: string;
  copertura: CoverageSummary;
  requisiti: RequirementCoverage[];
  criticita: ParticipationCriticita[];
}

export interface ParticipationSuggestion {
  forma: ParticipationForma;
  forma_label: string;
  motivazione: string;
  confidenza: "alta" | "media" | "bassa";
  company_ids: number[];
  mandataria_id: number | null;
  mandanti_ids: number[];
}

export interface ParticipationAnalysisResponse {
  suggerimento?: ParticipationSuggestion;
  analisi: ParticipationAnalysis;
}

export interface ParticipationAnalyzePayload {
  forma: ParticipationForma;
  company_ids: number[];
  ripartizione_requisiti?: Record<string, number>;
  avvalimenti?: {
    impresa_principale_id: number;
    impresa_ausiliaria_id: number;
    requisiti_coperti: number[];
  }[];
}

export const FORMA_LABELS: Record<ParticipationForma, string> = {
  singola: "Partecipazione singola",
  rti: "RTI",
  consorzio: "Consorzio",
  avvalimento: "Avvalimento",
};

export const COVERAGE_ESITO_LABELS: Record<CoverageEsito, string> = {
  soddisfatto: "Soddisfatto",
  parzialmente: "Parzialmente",
  non_soddisfatto: "Non soddisfatto",
};
