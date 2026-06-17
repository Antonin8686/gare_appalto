import api from "./client";
import type {
  RagContextualSearchParams,
  RagReindexParams,
  RagRetrieveSourcesParams,
  RagSearchParams,
  RagSearchResponse,
} from "../types/rag";

export async function ragSearch(params: RagSearchParams): Promise<RagSearchResponse> {
  const { data } = await api.post<RagSearchResponse>("/rag/search/", params);
  return data;
}

export async function ragContextualSearch(
  params: RagContextualSearchParams,
): Promise<RagSearchResponse> {
  const { data } = await api.post<RagSearchResponse>("/rag/search/contextual/", params);
  return data;
}

export async function ragRetrieveSources(
  params: RagRetrieveSourcesParams,
): Promise<RagSearchResponse> {
  const { data } = await api.post<RagSearchResponse>("/rag/sources/", params);
  return data;
}

export async function ragReindex(
  params: RagReindexParams = {},
): Promise<{ scope: string; counts?: Record<string, number>; task_id?: string; status?: string }> {
  const { data } = await api.post("/rag/reindex/", params);
  return data;
}
