import "./SortableTable.css";

export type SortDirection = "asc" | "desc";

interface SortableTableHeaderProps<T extends string> {
  column: T;
  label: string;
  activeColumn: T | null;
  direction: SortDirection;
  onSort: (column: T) => void;
}

export function SortableTableHeader<T extends string>({
  column,
  label,
  activeColumn,
  direction,
  onSort,
}: SortableTableHeaderProps<T>) {
  const isActive = activeColumn === column;
  const ariaSort = isActive ? (direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className={`sortable-table-btn${isActive ? " sortable-table-btn--active" : ""}`}
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        <span className="sortable-table-icon" aria-hidden>
          {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
