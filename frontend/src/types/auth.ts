import type { PermissionCode, UserRole } from "./rbac";

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  organization_id: number | null;
  organization_name: string | null;
  role: UserRole;
  role_label: string;
  permissions: PermissionCode[];
  is_active: boolean;
  date_joined: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  user: User;
}
