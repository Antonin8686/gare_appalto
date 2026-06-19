import type { SortDirection } from "../components/SortableTableHeader";

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}

export function compareOptionalStrings(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return (a ?? "").localeCompare(b ?? "", "it", { sensitivity: "base" });
}

export function sortRows<T, C extends string>(
  rows: T[],
  column: C | null,
  direction: SortDirection,
  compare: (a: T, b: T, column: C) => number,
  tieBreaker?: (a: T, b: T) => number,
): T[] {
  if (!column) return rows;

  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let comparison = compare(a, b, column);
    if (comparison === 0 && tieBreaker) {
      comparison = tieBreaker(a, b);
    }
    return comparison * factor;
  });
}
