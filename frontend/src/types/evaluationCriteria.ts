export type CriterionLivello = "criterio" | "subcriterio" | "microcriterio";

export interface EvaluationCriterionNode {
  id: number;
  livello: CriterionLivello;
  livello_label: string;
  titolo: string;
  descrizione: string;
  punteggio_massimo: string | null;
  punteggio_discrezionale: string | null;
  punteggio_tabellare: string | null;
  soglia_minima: string;
  elementi_premianti: string[];
  document_id: number | null;
  document_name: string | null;
  documento_origine: string;
  pagina_origine: string;
  paragrafo_origine: string;
  ordine: number;
  children: EvaluationCriterionNode[];
}

export interface EvaluationCriteriaSummary {
  criteri_count: number;
  punteggio_totale: string | null;
  elementi_premianti_count: number;
}

export interface EvaluationCriteriaTree {
  criteria: EvaluationCriterionNode[];
  summary: EvaluationCriteriaSummary;
}

export interface EvaluationCriteriaFilters {
  q?: string;
  livello?: CriterionLivello | "";
  document?: number | "";
}

export const CRITERION_LIVELLO_LABELS: Record<CriterionLivello, string> = {
  criterio: "Criterio",
  subcriterio: "Subcriterio",
  microcriterio: "Microcriterio",
};

export const CRITERION_LIVELLO_OPTIONS: { value: CriterionLivello | ""; label: string }[] = [
  { value: "", label: "Tutti i livelli" },
  ...(
    Object.entries(CRITERION_LIVELLO_LABELS) as [CriterionLivello, string][]
  ).map(([value, label]) => ({ value, label })),
];
