import api from "./client";
import type { RequirementMatrix, RequirementMatrixFilters } from "../types/requirementMatrix";

function buildFilterParams(filters: RequirementMatrixFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.categoria) params.categoria = filters.categoria;
  if (filters.tipo) params.tipo = filters.tipo;
  if (filters.esito) params.esito = filters.esito;
  if (filters.company) params.company = String(filters.company);
  return params;
}

export async function fetchRequirementMatrix(
  tenderId: number,
  filters: RequirementMatrixFilters = {},
): Promise<RequirementMatrix> {
  const { data } = await api.get<RequirementMatrix>(
    `/tenders/${tenderId}/requirements-matrix/`,
    { params: buildFilterParams(filters) },
  );
  return data;
}
