import api from "./client";
import type { TenderFase, TenderPriorita, TenderStato } from "../types/tender";

export interface DocumentSearchTender {
  id: number;
  cig: string;
  cpv: string;
  oggetto: string;
  fase: TenderFase;
  stato: TenderStato;
  scadenza: string;
  importo: string;
  priorita: TenderPriorita;
}

export interface DocumentSearchResult {
  id: number;
  name: string;
  original_filename: string;
  excerpt: string;
  similarity: number;
  tender: DocumentSearchTender;
}

export interface DocumentSearchResponse {
  results: DocumentSearchResult[];
}

export interface DocumentSearchParams {
  query: string;
  limit?: number;
  fase?: TenderFase;
}

export async function searchDocuments(
  params: DocumentSearchParams,
): Promise<DocumentSearchResponse> {
  const { data } = await api.post<DocumentSearchResponse>("/search/documents/", params);
  return data;
}
