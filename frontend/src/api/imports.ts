import api from "./client";
import type { ImportBatch } from "../types/import";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

const IMPORT_POLL_MS = 2000;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    if (!signal) return;

    if (signal.aborted) {
      window.clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function pollImportUntilSettled(
  fetchImport: (id: number, signal?: AbortSignal) => Promise<ImportBatch>,
  batch: ImportBatch,
  signal?: AbortSignal,
): Promise<ImportBatch> {
  let current = batch;
  while (current.status === "processing") {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    await delay(IMPORT_POLL_MS, signal);
    current = await fetchImport(current.id, signal);
  }
  return current;
}

export async function fetchTelematImports(): Promise<ImportBatch[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<ImportBatch>>("/telemat/imports/", {
      params: { page },
    });
    return data;
  });
}

export async function fetchTelematImport(id: number, signal?: AbortSignal): Promise<ImportBatch> {
  const { data } = await api.get<ImportBatch>(`/telemat/imports/${id}/`, { signal });
  return data;
}

export async function uploadTelematReport(file: File, signal?: AbortSignal): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportBatch>("/telemat/imports/", formData, { signal });
  return data;
}

export async function deleteTelematImport(id: number): Promise<void> {
  await api.delete(`/telemat/imports/${id}/`);
}

export async function fetchScoutingImports(): Promise<ImportBatch[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<ImportBatch>>("/scouting/imports/", {
      params: { page },
    });
    return data;
  });
}

export async function fetchScoutingImport(id: number, signal?: AbortSignal): Promise<ImportBatch> {
  const { data } = await api.get<ImportBatch>(`/scouting/imports/${id}/`, { signal });
  return data;
}

export async function uploadScoutingFile(file: File, signal?: AbortSignal): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportBatch>("/scouting/imports/", formData, { signal });
  return data;
}

export async function deleteScoutingImport(id: number): Promise<void> {
  await api.delete(`/scouting/imports/${id}/`);
}

export async function fetchWelfareImports(): Promise<ImportBatch[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<ImportBatch>>("/welfare/imports/", {
      params: { page },
    });
    return data;
  });
}

export async function fetchWelfareImport(id: number, signal?: AbortSignal): Promise<ImportBatch> {
  const { data } = await api.get<ImportBatch>(`/welfare/imports/${id}/`, { signal });
  return data;
}

export async function uploadWelfareReport(file: File, signal?: AbortSignal): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportBatch>("/welfare/imports/", formData, { signal });
  return data;
}

export async function deleteWelfareImport(id: number): Promise<void> {
  await api.delete(`/welfare/imports/${id}/`);
}

