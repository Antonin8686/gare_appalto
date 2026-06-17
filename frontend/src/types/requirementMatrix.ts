export type MatrixEsito = "soddisfatto" | "parzialmente" | "non_soddisfatto";

export type MatrixSemaforo = "verde" | "giallo" | "rosso";

export interface RequirementMatrixCompany {
  id: number;
  name: string;
}

export interface RequirementMatrixCell {
  company_id: number;
  company_name: string;
  esito: MatrixEsito;
  esito_label: string;
  semaforo: MatrixSemaforo;
  valore_posseduto: string;
  valore_richiesto: string;
  motivazione: string;
}

export interface RequirementMatrixRow {
  requirement_id: number;
  tipo: string;
  tipo_label: string;
  categoria: string;
  categoria_label: string;
  descrizione: string;
  soglia_minima: string;
  cells: RequirementMatrixCell[];
}

export interface RequirementMatrix {
  tender_id: number;
  tender_cig: string;
  companies: RequirementMatrixCompany[];
  requirements: RequirementMatrixRow[];
  summary: Record<MatrixEsito, number>;
}

export interface RequirementMatrixFilters {
  q?: string;
  categoria?: string;
  tipo?: string;
  esito?: MatrixEsito | "";
  company?: number | "";
}

export const MATRIX_ESITO_LABELS: Record<MatrixEsito, string> = {
  soddisfatto: "Soddisfatto",
  parzialmente: "Soddisfatto parzialmente",
  non_soddisfatto: "Non soddisfatto",
};

export const MATRIX_ESITO_OPTIONS: { value: MatrixEsito | ""; label: string }[] = [
  { value: "", label: "Tutti gli esiti" },
  { value: "soddisfatto", label: MATRIX_ESITO_LABELS.soddisfatto },
  { value: "parzialmente", label: MATRIX_ESITO_LABELS.parzialmente },
  { value: "non_soddisfatto", label: MATRIX_ESITO_LABELS.non_soddisfatto },
];
