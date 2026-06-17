import api from "./client";
import type {
  ParticipationAnalysisResponse,
  ParticipationAnalyzePayload,
  RTI,
  RTIPayload,
} from "../types/participation";

export async function fetchParticipationSuggestion(
  tenderId: number,
): Promise<ParticipationAnalysisResponse> {
  const { data } = await api.get<ParticipationAnalysisResponse>(
    `/tenders/${tenderId}/participation-analysis/`,
  );
  return data;
}

export async function analyzeParticipation(
  tenderId: number,
  payload: ParticipationAnalyzePayload,
): Promise<ParticipationAnalysisResponse> {
  const { data } = await api.post<ParticipationAnalysisResponse>(
    `/tenders/${tenderId}/participation-analysis/`,
    payload,
  );
  return data;
}

export async function fetchRTIList(tenderId: number): Promise<RTI[]> {
  const { data } = await api.get<RTI[]>(`/tenders/${tenderId}/rti/`);
  return data;
}

export async function createRTI(tenderId: number, payload: RTIPayload): Promise<RTI> {
  const { data } = await api.post<RTI>(`/tenders/${tenderId}/rti/`, payload);
  return data;
}

export async function updateRTI(
  tenderId: number,
  rtiId: number,
  payload: Partial<RTIPayload>,
): Promise<RTI> {
  const { data } = await api.patch<RTI>(`/tenders/${tenderId}/rti/${rtiId}/`, payload);
  return data;
}

export async function deleteRTI(tenderId: number, rtiId: number): Promise<void> {
  await api.delete(`/tenders/${tenderId}/rti/${rtiId}/`);
}
