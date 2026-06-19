export interface EconomicRelationOutline {
  pricing_model: string;
  importo_base: string;
  ribasso_massimo: string;
  iva_percentuale: string;
  formal_constraints: Record<string, unknown>;
  source_summary: string;
  totals: {
    imponibile: string;
    ribasso_percentuale: string;
    importo_post_ribasso: string;
    iva: string;
    totale: string;
  };
}

export interface EconomicRelationLineItem {
  id: string;
  voce: string;
  descrizione: string;
  unita_misura: string;
  quantita: string;
  prezzo_unitario: string;
  importo: string;
  ribasso_percentuale: string;
  notes: string;
  order: number;
  completed: boolean;
  source: string;
}

export interface EconomicRelation {
  id: number;
  tender: number;
  company_id: number | null;
  outline: EconomicRelationOutline;
  line_items: EconomicRelationLineItem[];
  generated_at: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface EconomicRelationPatchPayload {
  company_id?: number | null;
  line_items?: EconomicRelationLineItem[];
}

export interface GenerateEconomicOutlinePayload {
  company_id?: number | null;
}

export interface EconomicValidationIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  line_item_id: string;
}

export interface EconomicRelationValidationResult {
  valid: boolean;
  issues: EconomicValidationIssue[];
}

export function emptyEconomicRelationOutline(): EconomicRelationOutline {
  return {
    pricing_model: "a_corpo",
    importo_base: "",
    ribasso_massimo: "",
    iva_percentuale: "22",
    formal_constraints: {},
    source_summary: "",
    totals: {
      imponibile: "",
      ribasso_percentuale: "",
      importo_post_ribasso: "",
      iva: "",
      totale: "",
    },
  };
}

export function sortLineItemsByOrder(
  items: EconomicRelationLineItem[],
): EconomicRelationLineItem[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function lineItemsSaveFingerprint(
  items: EconomicRelationLineItem[],
  companyId: number | null,
): string {
  const payload = sortLineItemsByOrder(items).map((item) => ({
    id: item.id,
    voce: item.voce,
    descrizione: item.descrizione,
    unita_misura: item.unita_misura,
    quantita: item.quantita,
    prezzo_unitario: item.prezzo_unitario,
    importo: item.importo,
    ribasso_percentuale: item.ribasso_percentuale,
    notes: item.notes,
    order: item.order,
    completed: item.completed,
  }));
  return JSON.stringify({ companyId, line_items: payload });
}

export const PRICING_MODEL_LABELS: Record<string, string> = {
  a_corpo: "A corpo",
  prezzi_unitari: "Prezzi unitari",
  ribasso_percentuale: "Ribasso percentuale",
};
