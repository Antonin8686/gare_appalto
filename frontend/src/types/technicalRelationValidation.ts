export type ValidationType = "pagine" | "coerenza" | "requisiti";
export type ValidationSeverity = "rosso" | "giallo" | "info";

export interface ValidationWarning {
  id: string;
  type: ValidationType;
  severity: ValidationSeverity;
  message: string;
  section_id: string | null;
  requirement_id: number | null;
  detail: string | null;
}

export interface SectionPageStat {
  section_id: string;
  title: string;
  estimated_pages: number;
  suggested_pages: number;
}

export interface ValidationSummary {
  rosso: number;
  giallo: number;
  info: number;
  totale: number;
}

export interface ValidationPageStats {
  max_pages: number | null;
  total_estimated_pages: number;
  total_suggested_pages: number;
  sections: SectionPageStat[];
}

export interface TechnicalRelationValidationResult {
  warnings: ValidationWarning[];
  summary: ValidationSummary;
  page_stats: ValidationPageStats;
}

export const VALIDATION_TYPE_LABELS: Record<ValidationType, string> = {
  pagine: "Pagine",
  coerenza: "Coerenza",
  requisiti: "Requisiti",
};

export const VALIDATION_SEVERITY_LABELS: Record<ValidationSeverity, string> = {
  rosso: "Critico",
  giallo: "Attenzione",
  info: "Info",
};

export function warningsForSection(
  warnings: ValidationWarning[],
  sectionId: string,
): ValidationWarning[] {
  return warnings.filter((warning) => warning.section_id === sectionId);
}

export function highestSeverity(
  warnings: ValidationWarning[],
): ValidationSeverity | null {
  if (warnings.some((warning) => warning.severity === "rosso")) return "rosso";
  if (warnings.some((warning) => warning.severity === "giallo")) return "giallo";
  if (warnings.some((warning) => warning.severity === "info")) return "info";
  return null;
}

export function groupWarningsByType(
  warnings: ValidationWarning[],
): Record<ValidationType, ValidationWarning[]> {
  const groups: Record<ValidationType, ValidationWarning[]> = {
    pagine: [],
    coerenza: [],
    requisiti: [],
  };
  for (const warning of warnings) {
    groups[warning.type].push(warning);
  }
  return groups;
}
