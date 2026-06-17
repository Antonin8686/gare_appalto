import api from "./client";
import type { Tender, TenderPatchPayload, TenderPayload, TenderPriorita } from "../types/tender";
import { emptyFormalRules } from "../types/tenderFormalRules";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

function normalizeTender(tender: Tender): Tender {
  return {
    ...tender,
    formal_rules: tender.formal_rules ?? emptyFormalRules(),
  };
}

async function fetchTenderPage(
  params: Record<string, string | boolean | number>,
  page: number,
): Promise<PaginatedResponse<Tender>> {
  const { data } = await api.get<PaginatedResponse<Tender>>("/tenders/", {
    params: { ...params, page },
  });
  return {
    ...data,
    results: data.results.map(normalizeTender),
  };
}

export async function fetchTenders(): Promise<Tender[]> {
  return fetchAllPages((page) => fetchTenderPage({}, page));
}

export async function fetchImportedTenders(): Promise<Tender[]> {
  return fetchAllPages((page) => fetchTenderPage({ imported: true }, page));
}

export interface FetchScoutingTendersParams {
  priorita?: TenderPriorita | TenderPriorita[];
}

export async function fetchScoutingTenders(
  params: FetchScoutingTendersParams = {},
): Promise<Tender[]> {
  const query: Record<string, string> = { scouting: "true" };
  if (params.priorita) {
    const values = Array.isArray(params.priorita) ? params.priorita : [params.priorita];
    query.priorita = values.join(",");
  }
  return fetchAllPages((page) => fetchTenderPage(query, page));
}

export interface ScoutingScoreResult {
  scored: number;
  counts: Record<TenderPriorita, number>;
}

export async function rescoreScoutingTenders(): Promise<ScoutingScoreResult> {
  const { data } = await api.post<ScoutingScoreResult>("/scouting/score/");
  return data;
}

export async function fetchTender(id: number): Promise<Tender> {
  const { data } = await api.get<Tender>(`/tenders/${id}/`);
  return normalizeTender(data);
}

export async function createTender(payload: TenderPayload): Promise<Tender> {
  const { data } = await api.post<Tender>("/tenders/", payload);
  return normalizeTender(data);
}

export async function updateTender(id: number, payload: TenderPayload): Promise<Tender> {
  const { data } = await api.put<Tender>(`/tenders/${id}/`, payload);
  return normalizeTender(data);
}

export async function patchTender(id: number, payload: TenderPatchPayload): Promise<Tender> {
  const { data } = await api.patch<Tender>(`/tenders/${id}/`, payload);
  return normalizeTender(data);
}

export async function updateTenderFase(id: number, fase: Tender["fase"]): Promise<Tender> {
  return patchTender(id, { fase });
}

export async function deleteTender(id: number): Promise<void> {
  await api.delete(`/tenders/${id}/`);
}
