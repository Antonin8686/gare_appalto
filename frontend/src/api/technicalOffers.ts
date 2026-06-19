import api from "./client";
import type {
  TechnicalOffer,
  TechnicalOfferFacets,
  TechnicalOfferFilters,
  TechnicalOfferImportParams,
  TechnicalOfferImportResponse,
  TechnicalOfferLibraryMatch,
  TechnicalOfferPayload,
} from "../types/technicalOffer";
import { fetchAllPages, type PaginatedResponse } from "./pagination";

function buildFilterParams(filters: TechnicalOfferFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.category) params.category = filters.category;
  if (filters.settore) params.settore = filters.settore;
  if (filters.tipologia_servizio?.trim()) params.tipologia_servizio = filters.tipologia_servizio.trim();
  if (filters.ente_appaltante?.trim()) params.ente_appaltante = filters.ente_appaltante.trim();
  if (filters.anno) params.anno = filters.anno;
  if (filters.riutilizzabilita) params.riutilizzabilita = filters.riutilizzabilita;
  if (filters.innovativita) params.innovativita = filters.innovativita;
  if (filters.parola_chiave?.trim()) params.parola_chiave = filters.parola_chiave.trim();
  if (filters.valore_min) params.valore_min = filters.valore_min;
  if (filters.valore_max) params.valore_max = filters.valore_max;
  if (filters.punteggio_min) params.punteggio_min = filters.punteggio_min;
  return params;
}

export async function fetchTechnicalOffers(
  filters: TechnicalOfferFilters = {},
): Promise<TechnicalOffer[]> {
  const params = buildFilterParams(filters);
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<TechnicalOffer>>("/technical-offers/", {
      params: { ...params, page },
    });
    return data;
  });
}

export async function fetchTechnicalOfferFacets(
  filters: TechnicalOfferFilters = {},
): Promise<TechnicalOfferFacets> {
  const params = buildFilterParams(filters);
  const { data } = await api.get<TechnicalOfferFacets>("/technical-offers/facets/", {
    params,
  });
  return data;
}

export async function fetchTechnicalOffer(id: number): Promise<TechnicalOffer> {
  const { data } = await api.get<TechnicalOffer>(`/technical-offers/${id}/`);
  return data;
}

export async function createTechnicalOffer(
  payload: TechnicalOfferPayload,
): Promise<TechnicalOffer> {
  const { data } = await api.post<TechnicalOffer>("/technical-offers/", payload);
  return data;
}

export async function updateTechnicalOffer(
  id: number,
  payload: TechnicalOfferPayload,
): Promise<TechnicalOffer> {
  const { data } = await api.put<TechnicalOffer>(`/technical-offers/${id}/`, payload);
  return data;
}

export async function deleteTechnicalOffer(id: number): Promise<void> {
  await api.delete(`/technical-offers/${id}/`);
}

export async function importTechnicalOffers(
  params: TechnicalOfferImportParams,
): Promise<TechnicalOfferImportResponse> {
  const formData = new FormData();
  for (const file of params.files) {
    formData.append("files", file);
  }
  if (params.category) formData.append("category", params.category);
  if (params.settore) formData.append("settore", params.settore);
  if (params.ente_appaltante?.trim()) formData.append("ente_appaltante", params.ente_appaltante.trim());
  if (params.anno) formData.append("anno", String(params.anno));
  if (params.split_mode) formData.append("split_mode", params.split_mode);
  if (params.tags?.trim()) formData.append("tags", params.tags.trim());

  const { data } = await api.post<TechnicalOfferImportResponse>(
    "/technical-offers/import/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function fetchTechnicalOfferMatches(params: {
  section_title: string;
  category?: string;
  tender_oggetto?: string;
  limit?: number;
}): Promise<TechnicalOfferLibraryMatch[]> {
  const { data } = await api.get<{ results: TechnicalOfferLibraryMatch[] }>(
    "/technical-offers/matches/",
    { params },
  );
  return data.results;
}
