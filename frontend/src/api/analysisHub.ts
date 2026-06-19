import api from "./client";
import type { AnalysisHubResponse } from "../types/analysisHub";
import type { TenderPriorita, TenderSource } from "../types/tender";

export interface FetchAnalysisHubParams {
  source?: TenderSource | TenderSource[];
  priorita?: TenderPriorita | TenderPriorita[];
}

export async function fetchAnalysisHub(
  params: FetchAnalysisHubParams = {},
): Promise<AnalysisHubResponse> {
  const query: Record<string, string> = {};
  if (params.source) {
    const values = Array.isArray(params.source) ? params.source : [params.source];
    query.source = values.join(",");
  }
  if (params.priorita) {
    const values = Array.isArray(params.priorita) ? params.priorita : [params.priorita];
    query.priorita = values.join(",");
  }
  const { data } = await api.get<AnalysisHubResponse>("/analysis-hub/", { params: query });
  return data;
}
