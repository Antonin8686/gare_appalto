import { useCallback, useState } from "react";
import type { SortDirection } from "../components/SortableTableHeader";

export function useTableSort<T extends string>(
  defaultColumn: T | null = null,
  defaultDirection: SortDirection = "asc",
  descByDefault: T[] = [],
) {
  const [sortColumn, setSortColumn] = useState<T | null>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const handleSort = useCallback(
    (column: T) => {
      if (sortColumn === column) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }
      setSortColumn(column);
      setSortDirection(descByDefault.includes(column) ? "desc" : "asc");
    },
    [sortColumn, descByDefault],
  );

  return {
    sortColumn,
    sortDirection,
    handleSort,
    setSortColumn,
    setSortDirection,
  };
}
