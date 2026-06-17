import api from "./client";
import type {
  EvaluationCriteriaFilters,
  EvaluationCriteriaTree,
  EvaluationCriterionNode,
} from "../types/evaluationCriteria";

function buildFilterParams(filters: EvaluationCriteriaFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.livello) params.livello = filters.livello;
  if (filters.document) params.document = String(filters.document);
  return params;
}

export async function fetchEvaluationCriteriaTree(
  tenderId: number,
  filters: EvaluationCriteriaFilters = {},
): Promise<EvaluationCriteriaTree> {
  const { data } = await api.get<EvaluationCriteriaTree>(
    `/tenders/${tenderId}/evaluation-criteria/`,
    { params: buildFilterParams(filters) },
  );
  return data;
}

export async function fetchEvaluationCriterion(
  tenderId: number,
  criterionId: number,
): Promise<EvaluationCriterionNode> {
  const { data } = await api.get<EvaluationCriterionNode>(
    `/tenders/${tenderId}/evaluation-criteria/${criterionId}/`,
  );
  return data;
}
