import api from "./client";
import type { Company, CompanyPayload } from "../types/company";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

export async function fetchCompanies(): Promise<Company[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<Company>>("/companies/", {
      params: { page },
    });
    return data;
  });
}

export async function fetchCompany(id: number): Promise<Company> {
  const { data } = await api.get<Company>(`/companies/${id}/`);
  return data;
}

export async function createCompany(payload: CompanyPayload): Promise<Company> {
  const { data } = await api.post<Company>("/companies/", payload);
  return data;
}

export async function updateCompany(id: number, payload: CompanyPayload): Promise<Company> {
  const { data } = await api.put<Company>(`/companies/${id}/`, payload);
  return data;
}

export async function deleteCompany(id: number): Promise<void> {
  await api.delete(`/companies/${id}/`);
}
