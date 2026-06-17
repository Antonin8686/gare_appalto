export type RequirementTipo = "obbligatorio" | "tecnico" | "economico";

export type RequirementCategoria =
  | "generale"
  | "idoneita_professionale"
  | "economico_finanziario"
  | "tecnico_professionale"
  | "certificazione";

export interface TenderRequirement {
  id: number;
  tipo: RequirementTipo;
  tipo_label: string;
  categoria: RequirementCategoria;
  categoria_label: string;
  descrizione: string;
  soglia: string;
  soglia_minima: string;
  obbligatorio: boolean;
  premiante: boolean;
  migliorativo: boolean;
  document: number | null;
  document_name: string | null;
  documento_origine: string;
  pagina_origine: string;
  paragrafo_origine: string;
  modalita_comprova: string;
  soggetto_obbligato: string;
  avvalimento_consentito: boolean;
  rti_consentito: boolean;
  consorzio_consentito: boolean;
  note_interpretative: string;
  created_at: string;
}

export interface TenderRequirementFilters {
  q?: string;
  categoria?: RequirementCategoria | "";
  tipo?: RequirementTipo | "";
  obbligatorio?: boolean;
}

export const REQUIREMENT_TIPO_LABELS: Record<RequirementTipo, string> = {
  obbligatorio: "Obbligatorio",
  tecnico: "Tecnico",
  economico: "Economico",
};

export const REQUIREMENT_TIPO_DESCRIPTIONS: Record<RequirementTipo, string> = {
  obbligatorio: "Requisiti di idoneità e partecipazione",
  tecnico: "Requisiti di capacità tecnica e professionale",
  economico: "Requisiti di capacità economica e finanziaria",
};

export const REQUIREMENT_CATEGORIA_LABELS: Record<RequirementCategoria, string> = {
  generale: "Requisiti generali",
  idoneita_professionale: "Idoneità professionale",
  economico_finanziario: "Economico-finanziari",
  tecnico_professionale: "Tecnico-professionali",
  certificazione: "Certificazioni",
};

export const REQUIREMENT_CATEGORIA_OPTIONS: {
  value: RequirementCategoria | "";
  label: string;
}[] = [
  { value: "", label: "Tutte le categorie" },
  ...(
    Object.entries(REQUIREMENT_CATEGORIA_LABELS) as [RequirementCategoria, string][]
  ).map(([value, label]) => ({ value, label })),
];

export function requirementTipologiaLabel(req: TenderRequirement): string {
  const parts: string[] = [];
  if (req.obbligatorio) parts.push("Obbligatorio");
  if (req.premiante) parts.push("Premiante");
  if (req.migliorativo) parts.push("Migliorativo");
  if (parts.length === 0) parts.push("Non obbligatorio");
  return parts.join(" · ");
}
