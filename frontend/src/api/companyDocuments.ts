import api from "./client";
import type {
  CompanyDocument,
  CompanyDocumentFilters,
  CompanyDocumentUploadPayload,
  CompanyDocumentsExpiringResponse,
} from "../types/companyDocument";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

export async function fetchCompanyDocuments(
  companyId: number,
  filters: CompanyDocumentFilters = {},
): Promise<CompanyDocument[]> {
  const params: Record<string, string> = {};
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.categoria) params.categoria = filters.categoria;
  if (filters.stato_validita) params.stato_validita = filters.stato_validita;

  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<CompanyDocument>>(
      `/companies/${companyId}/documents/`,
      { params: { ...params, page } },
    );
    return data;
  });
}

export async function uploadCompanyDocument(
  companyId: number,
  payload: CompanyDocumentUploadPayload,
): Promise<CompanyDocument> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("categoria", payload.categoria);
  if (payload.data_rilascio) {
    formData.append("data_rilascio", payload.data_rilascio);
  }
  if (payload.data_scadenza) {
    formData.append("data_scadenza", payload.data_scadenza);
  }
  if (payload.note?.trim()) {
    formData.append("note", payload.note.trim());
  }

  const { data } = await api.post<CompanyDocument>(
    `/companies/${companyId}/documents/`,
    formData,
  );
  return data;
}

export async function deleteCompanyDocument(
  companyId: number,
  documentId: number,
): Promise<void> {
  await api.delete(`/companies/${companyId}/documents/${documentId}/`);
}

export async function downloadCompanyDocument(
  companyId: number,
  document: CompanyDocument,
): Promise<void> {
  const { data } = await api.get<Blob>(
    `/companies/${companyId}/documents/${document.id}/download/`,
    { responseType: "blob" },
  );

  const url = URL.createObjectURL(data);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.original_filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchExpiringCompanyDocuments(
  options: { days?: number; companyId?: number } = {},
): Promise<CompanyDocumentsExpiringResponse> {
  const params: Record<string, string | number> = {};
  if (options.days !== undefined) params.days = options.days;
  if (options.companyId !== undefined) params.company = options.companyId;

  const { data } = await api.get<CompanyDocumentsExpiringResponse>(
    "/companies/documents/expiring/",
    { params },
  );
  return data;
}
