export type FormalRuleCategory = "pagine" | "font" | "margini" | "allegati";

export interface FormalRuleItem {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
}

export type FormalRules = Record<FormalRuleCategory, FormalRuleItem[]>;

export const FORMAL_RULE_CATEGORIES: FormalRuleCategory[] = [
  "pagine",
  "font",
  "margini",
  "allegati",
];

export const FORMAL_RULE_CATEGORY_LABELS: Record<FormalRuleCategory, string> = {
  pagine: "Pagine",
  font: "Font",
  margini: "Margini",
  allegati: "Allegati",
};

export const FORMAL_RULE_CATEGORY_DESCRIPTIONS: Record<FormalRuleCategory, string> = {
  pagine: "Limiti e vincoli sul numero di pagine dell'offerta.",
  font: "Tipografia e formattazione del testo.",
  margini: "Margini, spaziature e impaginazione.",
  allegati: "Documenti e allegati richiesti.",
};

export function emptyFormalRules(): FormalRules {
  return {
    pagine: [],
    font: [],
    margini: [],
    allegati: [],
  };
}

export function countFormalRules(rules: FormalRules): { total: number; checked: number } {
  let total = 0;
  let checked = 0;

  for (const category of FORMAL_RULE_CATEGORIES) {
    for (const item of rules[category]) {
      total += 1;
      if (item.checked) checked += 1;
    }
  }

  return { total, checked };
}
