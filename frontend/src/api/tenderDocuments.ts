import api from "./client";
import type { TenderDocument } from "../types/tenderDocument";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

export async function fetchTenderDocuments(tenderId: number): Promise<TenderDocument[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<TenderDocument>>(
      `/tenders/${tenderId}/documents/`,
      { params: { page } },
    );
    return data;
  });
}

export async function uploadTenderDocument(
  tenderId: number,
  file: File,
  name?: string,
): Promise<TenderDocument> {
  const formData = new FormData();
  formData.append("file", file);
  if (name) {
    formData.append("name", name);
  }

  const { data } = await api.post<TenderDocument>(
    `/tenders/${tenderId}/documents/`,
    formData,
  );
  return data;
}

export async function deleteTenderDocument(tenderId: number, documentId: number): Promise<void> {
  await api.delete(`/tenders/${tenderId}/documents/${documentId}/`);
}

export async function downloadTenderDocument(
  tenderId: number,
  document: TenderDocument,
): Promise<void> {
  const { data } = await api.get<Blob>(
    `/tenders/${tenderId}/documents/${document.id}/download/`,
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
