import api from "./client";
import type { TenderEvaluation } from "../types/evaluation";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

export async function fetchTenderEvaluations(
  tenderId: number,
): Promise<TenderEvaluation[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<TenderEvaluation>>(
      `/tenders/${tenderId}/evaluations/`,
      { params: { page } },
    );
    return data;
  });
}

export async function runTenderEvaluations(
  tenderId: number,
): Promise<TenderEvaluation[]> {
  const { data } = await api.post<TenderEvaluation[]>(
    `/tenders/${tenderId}/evaluations/evaluate/`,
  );
  return data;
}
