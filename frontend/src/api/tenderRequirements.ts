import api from "./client";
import type { TenderRequirement, TenderRequirementFilters } from "../types/tenderRequirement";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

function buildFilterParams(filters: TenderRequirementFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.categoria) params.categoria = filters.categoria;
  if (filters.tipo) params.tipo = filters.tipo;
  if (filters.obbligatorio) params.obbligatorio = "true";
  return params;
}

export async function fetchTenderRequirements(
  tenderId: number,
  filters: TenderRequirementFilters = {},
): Promise<TenderRequirement[]> {
  const params = buildFilterParams(filters);
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<TenderRequirement>>(
      `/tenders/${tenderId}/requirements/`,
      { params: { ...params, page } },
    );
    return data;
  });
}

export async function fetchTenderRequirement(
  tenderId: number,
  requirementId: number,
): Promise<TenderRequirement> {
  const { data } = await api.get<TenderRequirement>(
    `/tenders/${tenderId}/requirements/${requirementId}/`,
  );
  return data;
}
