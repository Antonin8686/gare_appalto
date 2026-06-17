import api from "./client";
import type { DashboardFilters, DashboardKPIs } from "../types/dashboard";

export async function fetchDashboardKPIs(filters?: Partial<DashboardFilters>): Promise<DashboardKPIs> {
  const params: Record<string, string> = {};
  if (filters?.period) params.period = filters.period;
  if (filters?.source) params.source = filters.source;
  if (filters?.fase) params.fase = filters.fase;
  if (filters?.doc_days) params.doc_days = String(filters.doc_days);

  const { data } = await api.get<DashboardKPIs>("/dashboard/kpis/", { params });
  return data;
}
