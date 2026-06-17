export type Semaforo = "verde" | "giallo" | "rosso";

export interface RequirementEvaluation {
  requirement_id: number;
  tipo: string;
  descrizione: string;
  soglia: string;
  esito: Semaforo;
  motivo: string;
  evidenza?: Record<string, unknown>;
}

export interface TenderEvaluation {
  id: number;
  company_id: number;
  company_name: string;
  semaforo: Semaforo;
  motivazione: string;
  dettagli: RequirementEvaluation[];
  evaluated_at: string;
}

export const SEMAFORO_LABELS: Record<Semaforo, string> = {
  verde: "Compatibile",
  giallo: "Parzialmente compatibile",
  rosso: "Non compatibile",
};

export const SEMAFORO_DESCRIPTIONS: Record<Semaforo, string> = {
  verde: "Tutti i requisiti risultano soddisfatti",
  giallo: "Alcuni requisiti richiedono verifica manuale",
  rosso: "Requisiti critici non soddisfatti",
};
