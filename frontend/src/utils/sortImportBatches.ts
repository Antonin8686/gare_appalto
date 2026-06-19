import type { SortDirection } from "../components/SortableTableHeader";
import type { ImportBatch, ImportStatus } from "../types/import";
import { compareNumbers, compareStrings, sortRows } from "./tableSort";

export type ImportBatchSortColumn =
  | "filename"
  | "status"
  | "tenders_created"
  | "tenders_updated"
  | "file_size"
  | "uploaded_at";

const STATUS_ORDER: Record<ImportStatus, number> = {
  processing: 0,
  done: 1,
  failed: 2,
};

export const IMPORT_BATCH_TABLE_COLUMNS: { id: ImportBatchSortColumn; label: string }[] = [
  { id: "filename", label: "File" },
  { id: "status", label: "Stato" },
  { id: "tenders_created", label: "Gare create" },
  { id: "tenders_updated", label: "Aggiornate" },
  { id: "file_size", label: "Dimensione" },
  { id: "uploaded_at", label: "Caricato il" },
];

function compareImportBatch(a: ImportBatch, b: ImportBatch, column: ImportBatchSortColumn): number {
  switch (column) {
    case "filename":
      return compareStrings(a.original_filename, b.original_filename);
    case "status":
      return (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    case "tenders_created":
      return compareNumbers(a.tenders_created, b.tenders_created);
    case "tenders_updated":
      return compareNumbers(a.tenders_updated ?? 0, b.tenders_updated ?? 0);
    case "file_size":
      return compareNumbers(a.file_size, b.file_size);
    case "uploaded_at":
      return compareStrings(a.uploaded_at, b.uploaded_at);
  }
}

export function sortImportBatches(
  batches: ImportBatch[],
  column: ImportBatchSortColumn | null,
  direction: SortDirection,
): ImportBatch[] {
  return sortRows(batches, column, direction, compareImportBatch, (a, b) =>
    compareStrings(a.original_filename, b.original_filename),
  );
}
