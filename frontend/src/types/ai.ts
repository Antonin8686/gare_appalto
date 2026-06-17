import type { RagSource } from "./rag";

export type AiActionType =
  | "technical_criterion"
  | "improvement_proposal"
  | "content_adaptation"
  | "report_structure";

export const AI_ACTION_LABELS: Record<AiActionType, string> = {
  technical_criterion: "Genera criterio tecnico",
  improvement_proposal: "Proponi migliorie",
  content_adaptation: "Adatta contenuto",
  report_structure: "Genera struttura relazione",
};

export const AI_ACTION_DESCRIPTIONS: Record<AiActionType, string> = {
  technical_criterion: "Crea il testo tecnico per la sezione attiva.",
  improvement_proposal: "Suggerisce miglioramenti al contenuto esistente.",
  content_adaptation: "Adatta il contenuto al contesto gara/azienda.",
  report_structure: "Propone la struttura complessiva della relazione.",
};

export interface AiConfig {
  provider: string;
  model: string;
  configured: boolean;
}

export interface AiGenerateParams {
  action: AiActionType;
  tender_id?: number | null;
  company_id?: number | null;
  section_id?: string;
  section_title?: string;
  section_content?: string;
  criterion_description?: string;
  instructions?: string;
  rag_query?: string;
}

export interface AiGenerationResult {
  id: number;
  action_type: AiActionType;
  content: string;
  model: string;
  provider: string;
  prompt: string;
  sources: RagSource[];
  rag_chunks?: Record<string, unknown>[];
  created_at: string;
}

export interface AiGenerationSummary {
  id: number;
  action_type: AiActionType;
  model: string;
  provider: string;
  section_id: string;
  sources: RagSource[];
  created_at: string;
}

export interface AiErrorResponse {
  detail: string;
  code?: string;
}
