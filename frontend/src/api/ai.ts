import api from "./client";
import type {
  AiConfig,
  AiGenerateParams,
  AiGenerationResult,
  AiGenerationSummary,
} from "../types/ai";

export async function fetchAiConfig(): Promise<AiConfig> {
  const { data } = await api.get<AiConfig>("/ai/config/");
  return data;
}

export async function generateAiContent(params: AiGenerateParams): Promise<AiGenerationResult> {
  const { data } = await api.post<AiGenerationResult>("/ai/generate/", params);
  return data;
}

export async function fetchAiGenerations(params: {
  tender_id?: number;
  section_id?: string;
  action?: string;
} = {}): Promise<AiGenerationSummary[]> {
  const { data } = await api.get<AiGenerationSummary[]>("/ai/generations/", { params });
  return data;
}
