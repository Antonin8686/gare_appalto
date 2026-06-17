import api from "./client";
import type {
  GenerateOutlinePayload,
  TechnicalRelation,
  TechnicalRelationPatchPayload,
  TechnicalRelationSection,
  TechnicalRelationVersion,
} from "../types/tenderTechnicalRelation";
import type { TechnicalRelationValidationResult } from "../types/technicalRelationValidation";
import { emptyTechnicalRelationOutline } from "../types/tenderTechnicalRelation";

function normalizeTechnicalRelation(data: TechnicalRelation): TechnicalRelation {
  return {
    ...data,
    outline: data.outline ?? emptyTechnicalRelationOutline(),
    sections: data.sections ?? [],
  };
}

export async function fetchTechnicalRelation(tenderId: number): Promise<TechnicalRelation> {
  const { data } = await api.get<TechnicalRelation>(
    `/tenders/${tenderId}/technical-relation/`,
  );
  return normalizeTechnicalRelation(data);
}

export async function fetchTechnicalRelationVersions(
  tenderId: number,
): Promise<TechnicalRelationVersion[]> {
  const { data } = await api.get<TechnicalRelationVersion[]>(
    `/tenders/${tenderId}/technical-relation/versions/`,
  );
  return data;
}

export async function restoreTechnicalRelationVersion(
  tenderId: number,
  version: number,
): Promise<TechnicalRelation> {
  const { data } = await api.post<TechnicalRelation>(
    `/tenders/${tenderId}/technical-relation/versions/${version}/restore/`,
  );
  return normalizeTechnicalRelation(data);
}

export async function patchTechnicalRelation(
  tenderId: number,
  payload: TechnicalRelationPatchPayload,
): Promise<TechnicalRelation> {
  const { data } = await api.patch<TechnicalRelation>(
    `/tenders/${tenderId}/technical-relation/`,
    payload,
  );
  return normalizeTechnicalRelation(data);
}

export async function generateTechnicalRelationOutline(
  tenderId: number,
  payload: GenerateOutlinePayload = {},
): Promise<TechnicalRelation> {
  const { data } = await api.post<TechnicalRelation>(
    `/tenders/${tenderId}/technical-relation/outline/`,
    payload,
  );
  return normalizeTechnicalRelation(data);
}

export async function validateTechnicalRelation(
  tenderId: number,
  sections?: TechnicalRelationSection[],
): Promise<TechnicalRelationValidationResult> {
  const payload = sections ? { sections } : {};
  const { data } = await api.post<TechnicalRelationValidationResult>(
    `/tenders/${tenderId}/technical-relation/validate/`,
    payload,
  );
  return data;
}
