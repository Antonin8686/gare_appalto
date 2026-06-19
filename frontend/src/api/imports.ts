import api from "./client";
import type { ImportBatch } from "../types/import";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

export async function fetchTelematImports(): Promise<ImportBatch[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<ImportBatch>>("/telemat/imports/", {
      params: { page },
    });
    return data;
  });
}

export async function uploadTelematReport(file: File): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportBatch>("/telemat/imports/", formData);
  return data;
}

export async function fetchScoutingImports(): Promise<ImportBatch[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<ImportBatch>>("/scouting/imports/", {
      params: { page },
    });
    return data;
  });
}

export async function uploadScoutingFile(file: File): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportBatch>("/scouting/imports/", formData);
  return data;
}

export async function fetchWelfareImports(): Promise<ImportBatch[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<ImportBatch>>("/welfare/imports/", {
      params: { page },
    });
    return data;
  });
}

export async function uploadWelfareReport(file: File): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportBatch>("/welfare/imports/", formData);
  return data;
}

