import api from "./client";
import { fetchAllPages, isPaginatedResponse, type PaginatedResponse } from "./pagination";
import type {
  CreateOrganizationUserPayload,
  OrganizationUser,
  RbacMatrix,
  UpdateOrganizationUserPayload,
} from "../types/rbac";

export async function fetchOrganizationUsers(): Promise<OrganizationUser[]> {
  return fetchAllPages(async (page) => {
    const { data } = await api.get<PaginatedResponse<OrganizationUser> | OrganizationUser[]>(
      "/auth/users/",
      { params: { page } },
    );
    if (isPaginatedResponse<OrganizationUser>(data)) {
      return data;
    }
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  });
}
export async function createOrganizationUser(
  payload: CreateOrganizationUserPayload,
): Promise<OrganizationUser> {
  const { data } = await api.post<OrganizationUser>("/auth/users/create/", payload);
  return data;
}

export async function updateOrganizationUser(
  userId: number,
  payload: UpdateOrganizationUserPayload,
): Promise<OrganizationUser> {
  const { data } = await api.patch<OrganizationUser>(`/auth/users/${userId}/`, payload);
  return data;
}

export async function deleteOrganizationUser(userId: number): Promise<void> {
  await api.delete(`/auth/users/${userId}/`);
}

export async function fetchRbacMatrix(): Promise<RbacMatrix> {
  const { data } = await api.get<RbacMatrix>("/auth/rbac/matrix/");
  return data;
}
