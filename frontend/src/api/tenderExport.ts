import api from "./client";
import type { TenderExportOptions, TenderExportRequest } from "../types/tenderExport";

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] ?? fallback;
}

export async function fetchTenderExportOptions(tenderId: number): Promise<TenderExportOptions> {
  const { data } = await api.get<TenderExportOptions>(`/tenders/${tenderId}/export/options/`);
  return data;
}

export async function downloadTenderExport(
  tenderId: number,
  payload: TenderExportRequest,
): Promise<void> {
  const response = await api.post<Blob>(`/tenders/${tenderId}/export/`, payload, {
    responseType: "blob",
  });

  const filename = parseFilename(
    response.headers["content-disposition"],
    payload.bundle ? "fascicolo-gara.zip" : `export-gara.${payload.format}`,
  );
  triggerBrowserDownload(response.data, filename);
}
