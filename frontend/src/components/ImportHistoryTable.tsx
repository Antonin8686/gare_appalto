import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SortableTableHeader } from "./SortableTableHeader";
import type { SortDirection } from "./SortableTableHeader";
import { IMPORT_STATUS_LABELS, type ImportBatch } from "../types/import";
import {
  IMPORT_BATCH_TABLE_COLUMNS,
  type ImportBatchSortColumn,
} from "../utils/sortImportBatches";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: ImportBatch["status"]): string {
  return `telemat-upload-status telemat-upload-status--${status}`;
}

export interface ImportHistoryTableProps {
  batches: ImportBatch[];
  sortColumn: ImportBatchSortColumn | null;
  sortDirection: SortDirection;
  onSort: (column: ImportBatchSortColumn) => void;
  deleteImport: (id: number) => Promise<void>;
  invalidateQueryKeys: string[][];
  createdColumnLabel?: string;
}

export function ImportHistoryTable({
  batches,
  sortColumn,
  sortDirection,
  onSort,
  deleteImport,
  invalidateQueryKeys,
  createdColumnLabel,
}: ImportHistoryTableProps) {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteImport,
    onMutate: (id) => {
      setDeletingId(id);
      setDeleteError(null);
    },
    onSuccess: async () => {
      setConfirmDeleteId(null);
      await Promise.all(
        invalidateQueryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Impossibile eliminare l'importazione.";
      setDeleteError(message);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  function handleConfirmDelete(id: number) {
    deleteMutation.mutate(id);
  }

  return (
    <>
      {deleteError && <p className="telemat-upload-error">{deleteError}</p>}
      <div className="telemat-upload-table-card">
        <table className="telemat-upload-table">
          <thead>
            <tr>
              {IMPORT_BATCH_TABLE_COLUMNS.map(({ id, label }) => (
                <SortableTableHeader
                  key={id}
                  column={id}
                  label={
                    id === "tenders_created" && createdColumnLabel
                      ? createdColumnLabel
                      : label
                  }
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={onSort}
                />
              ))}
              <th aria-sort="none">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td>{batch.original_filename}</td>
                <td>
                  <span className={statusClass(batch.status)}>
                    {batch.status === "processing" && (
                      <span className="telemat-upload-status-spinner" aria-hidden />
                    )}
                    {IMPORT_STATUS_LABELS[batch.status]}
                  </span>
                  {batch.status === "failed" && batch.error_message && (
                    <span className="telemat-upload-error-detail">{batch.error_message}</span>
                  )}
                </td>
                <td>{batch.tenders_created}</td>
                <td>{batch.tenders_updated ?? 0}</td>
                <td>{formatFileSize(batch.file_size)}</td>
                <td>{formatDate(batch.uploaded_at)}</td>
                <td>
                  {confirmDeleteId === batch.id ? (
                    <div className="telemat-upload-delete-confirm">
                      <span className="telemat-upload-delete-confirm-label">Eliminare?</span>
                      <div className="telemat-upload-delete-confirm-buttons">
                        <button
                          type="button"
                          className="telemat-upload-delete-confirm-btn"
                          onClick={() => handleConfirmDelete(batch.id)}
                          disabled={deletingId === batch.id}
                        >
                          {deletingId === batch.id ? "Eliminazione..." : "Conferma"}
                        </button>
                        <button
                          type="button"
                          className="telemat-upload-delete-cancel-btn"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === batch.id}
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="telemat-upload-delete-btn"
                      onClick={() => setConfirmDeleteId(batch.id)}
                      disabled={deletingId !== null}
                      aria-label={`Elimina importazione ${batch.original_filename}`}
                    >
                      Cancella
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
