import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { PermissionCode } from "../types/rbac";

interface PermissionRouteProps {
  permission: PermissionCode;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { can, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <p>Caricamento...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
