import { useQuery } from "@tanstack/react-query";
import { fetchRbacMatrix } from "../api/users";
import { PERMISSION_GROUP_LABELS } from "../types/rbac";
import type { UserRole } from "../types/rbac";
import "./PermissionMatrix.css";

export function PermissionMatrix() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rbac", "matrix"],
    queryFn: fetchRbacMatrix,
  });

  if (isLoading) {
    return <p className="permission-matrix__loading">Caricamento matrice permessi...</p>;
  }

  if (isError || !data) {
    return <p className="permission-matrix__error">Impossibile caricare la matrice permessi.</p>;
  }

  const allPermissions = Object.entries(data.permission_groups).flatMap(([group, perms]) =>
    Object.keys(perms).map((code) => ({ code, group, label: perms[code] })),
  );

  return (
    <section className="permission-matrix">
      <header className="permission-matrix__header">
        <h3>Matrice ruoli e permessi</h3>
        <p>Visualizzazione dei permessi granulari assegnati a ciascun ruolo.</p>
      </header>

      <div className="permission-matrix__table-wrap">
        <table className="permission-matrix__table">
          <thead>
            <tr>
              <th>Permesso</th>
              <th>Area</th>
              {data.roles.map((role) => (
                <th key={role.id}>{role.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPermissions.map((permission) => (
              <tr key={permission.code}>
                <td>{permission.label}</td>
                <td>{PERMISSION_GROUP_LABELS[permission.group] ?? permission.group}</td>
                {data.roles.map((role) => (
                  <td key={role.id} className="permission-matrix__cell">
                    {data.role_permissions[role.id as UserRole]?.includes(permission.code) ? (
                      <span className="permission-matrix__yes" aria-label="Consentito">
                        ✓
                      </span>
                    ) : (
                      <span className="permission-matrix__no" aria-label="Negato">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
