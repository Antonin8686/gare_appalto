export type UserRole =
  | "administrator"
  | "tender_manager"
  | "technical_writer"
  | "reviewer"
  | "company_user"
  | "scouting_manager";

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  tender_manager: "Tender Manager",
  technical_writer: "Technical Writer",
  reviewer: "Reviewer",
  company_user: "Company User",
  scouting_manager: "Scouting Manager",
};

export type PermissionCode =
  | "tenders.view"
  | "tenders.create"
  | "tenders.edit"
  | "tenders.delete"
  | "tenders.export"
  | "tenders.relation.edit"
  | "tenders.relation.review"
  | "tenders.participation"
  | "companies.view"
  | "companies.create"
  | "companies.edit"
  | "companies.delete"
  | "documents.view"
  | "documents.upload"
  | "documents.delete"
  | "offers.view"
  | "offers.create"
  | "offers.edit"
  | "offers.delete"
  | "scouting.view"
  | "scouting.import"
  | "scouting.score"
  | "admin.users.view"
  | "admin.users.manage"
  | "admin.rag.reindex"
  | "admin.ai.use";

export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  gare: "Gare",
  aziende: "Aziende",
  documenti: "Documenti",
  offerte: "Offerte tecniche",
  scouting: "Scouting",
  amministrazione: "Amministrazione",
};

export interface RbacRole {
  id: UserRole;
  label: string;
}

export interface RbacMatrix {
  roles: RbacRole[];
  permission_groups: Record<string, Record<string, string>>;
  permission_labels: Record<string, string>;
  role_permissions: Record<UserRole, string[]>;
}

export interface OrganizationUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  organization_id: number | null;
  organization_name: string | null;
  role: UserRole;
  role_label: string;
  permissions: string[];
  is_active: boolean;
  date_joined: string;
}

export interface CreateOrganizationUserPayload {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UpdateOrganizationUserPayload {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  is_active?: boolean;
  password?: string;
}
