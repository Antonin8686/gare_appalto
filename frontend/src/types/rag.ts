export type RagSourceType =
  | "tender_document"
  | "technical_offer"
  | "requirement"
  | "company";

export const RAG_SOURCE_TYPE_LABELS: Record<RagSourceType, string> = {
  tender_document: "Documento gara",
  technical_offer: "Offerta tecnica",
  requirement: "Requisito",
  company: "Dati aziendali",
};

export interface RagDocumentSource {
  id: number;
  name: string;
  original_filename?: string;
  url_path?: string | null;
}

export interface RagSource {
  source_type: RagSourceType;
  source_id: number;
  title: string;
  url_path?: string | null;
  chunk_index?: number;
  original_filename?: string;
}

export interface RagSearchHit {
  id: number;
  source_type: RagSourceType;
  source_type_label: string;
  source_id: number;
  chunk_index: number;
  title: string;
  excerpt: string;
  text: string;
  similarity: number | null;
  metadata: Record<string, unknown>;
  source: RagSource;
  document: RagDocumentSource | null;
  indexed_at?: string | null;
}

export interface RagSearchResponse {
  results: RagSearchHit[];
  sources: RagSource[];
}

export interface RagSearchParams {
  query: string;
  limit?: number;
  source_types?: RagSourceType[];
}

export interface RagContextualSearchParams extends RagSearchParams {
  tender_id?: number | null;
  company_id?: number | null;
}

export interface RagRetrieveSourcesParams {
  chunk_ids?: number[];
  sources?: Array<{ source_type: RagSourceType; source_id: number }>;
}

export interface RagReindexParams {
  scope?: "all" | "tender_documents" | "technical_offers" | "requirements" | "companies";
  async_task?: boolean;
}
