import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchRbacMatrix } from "../api/users";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import { compareStrings, sortRows } from "../utils/tableSort";
import { PERMISSION_GROUP_LABELS } from "../types/rbac";
import type { UserRole } from "../types/rbac";
import "./PermissionMatrix.css";

type SortColumn = "permission" | "area";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "permission", label: "Permesso" },
  { id: "area", label: "Area" },
];

interface PermissionRow {
  code: string;
  group: string;
  label: string;
}

function comparePermissions(a: PermissionRow, b: PermissionRow, column: SortColumn): number {
  switch (column) {
    case "permission":
      return compareStrings(a.label, b.label);
    case "area":
      return compareStrings(
        PERMISSION_GROUP_LABELS[a.group] ?? a.group,
        PERMISSION_GROUP_LABELS[b.group] ?? b.group,
      );
  }
}

export function PermissionMatrix() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rbac", "matrix"],
    queryFn: fetchRbacMatrix,
  });

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>("area", "asc");

  const allPermissions = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.permission_groups).flatMap(([group, perms]) =>
      Object.keys(perms).map((code) => ({ code, group, label: perms[code] })),
    );
  }, [data]);

  const sortedPermissions = useMemo(
    () =>
      sortRows(allPermissions, sortColumn, sortDirection, comparePermissions, (a, b) =>
        compareStrings(a.label, b.label),
      ),
    [allPermissions, sortColumn, sortDirection],
  );

  if (isLoading) {
    return <p className="permission-matrix__loading">Caricamento matrice permessi...</p>;
  }

  if (isError || !data) {
    return <p className="permission-matrix__error">Impossibile caricare la matrice permessi.</p>;
  }

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
              {TABLE_COLUMNS.map(({ id, label }) => (
                <SortableTableHeader
                  key={id}
                  column={id}
                  label={label}
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              ))}
              {data.roles.map((role) => (
                <th key={role.id}>{role.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPermissions.map((permission) => (
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
