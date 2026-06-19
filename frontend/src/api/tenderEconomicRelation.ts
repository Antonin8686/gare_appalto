import api from "./client";
import type {
  EconomicRelation,
  EconomicRelationPatchPayload,
  EconomicRelationValidationResult,
  GenerateEconomicOutlinePayload,
} from "../types/tenderEconomicRelation";
import { emptyEconomicRelationOutline } from "../types/tenderEconomicRelation";

function normalizeEconomicRelation(data: EconomicRelation): EconomicRelation {
  return {
    ...data,
    outline: data.outline ?? emptyEconomicRelationOutline(),
    line_items: data.line_items ?? [],
  };
}

export async function fetchEconomicRelation(tenderId: number): Promise<EconomicRelation> {
  const { data } = await api.get<EconomicRelation>(`/tenders/${tenderId}/economic-relation/`);
  return normalizeEconomicRelation(data);
}

export async function patchEconomicRelation(
  tenderId: number,
  payload: EconomicRelationPatchPayload,
): Promise<EconomicRelation> {
  const { data } = await api.patch<EconomicRelation>(
    `/tenders/${tenderId}/economic-relation/`,
    payload,
  );
  return normalizeEconomicRelation(data);
}

export async function generateEconomicRelationOutline(
  tenderId: number,
  payload: GenerateEconomicOutlinePayload = {},
): Promise<EconomicRelation> {
  const { data } = await api.post<EconomicRelation>(
    `/tenders/${tenderId}/economic-relation/outline/`,
    payload,
  );
  return normalizeEconomicRelation(data);
}

export async function validateEconomicRelation(
  tenderId: number,
  lineItems?: EconomicRelation["line_items"],
): Promise<EconomicRelationValidationResult> {
  const payload = lineItems ? { line_items: lineItems } : {};
  const { data } = await api.post<EconomicRelationValidationResult>(
    `/tenders/${tenderId}/economic-relation/validate/`,
    payload,
  );
  return data;
}

export interface AutoGenerateOffersResult {
  generated: { technical: boolean; economic: boolean };
  technical_relation: Record<string, unknown>;
  economic_relation: EconomicRelation;
}

export async function autoGenerateOffers(
  tenderId: number,
  force = false,
): Promise<AutoGenerateOffersResult> {
  const { data } = await api.post<AutoGenerateOffersResult>(
    `/tenders/${tenderId}/offers/auto-generate/`,
    { force },
  );
  return {
    ...data,
    economic_relation: normalizeEconomicRelation(data.economic_relation),
  };
}
