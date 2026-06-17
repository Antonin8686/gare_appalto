import type { PermissionCode, UserRole } from "../types/rbac";
import type { User } from "../types/auth";

export function can(user: User | null, permission: PermissionCode): boolean {
  if (!user) {
    return false;
  }
  return (user.permissions ?? []).includes(permission);
}
export function hasRole(user: User | null, role: UserRole): boolean {
  return user?.role === role;
}

export function canAny(user: User | null, permissions: PermissionCode[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function canAll(user: User | null, permissions: PermissionCode[]): boolean {
  return permissions.every((permission) => can(user, permission));
}
