import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchTelematImports, uploadTelematReport } from "../api/imports";
import { ImportUploadPanel } from "../components/ImportUploadPanel";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import {
  IMPORT_STATUS_LABELS,
  TELEMAT_IMPORT_ACCEPT,
  TELEMAT_IMPORT_EXTENSIONS,
  type ImportBatch,
} from "../types/import";
import {
  IMPORT_BATCH_TABLE_COLUMNS,
  sortImportBatches,
  type ImportBatchSortColumn,
} from "../utils/sortImportBatches";
import "./TelematUpload.css";

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

function validateTelematFile(file: File): string | null {
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  if (
    !TELEMAT_IMPORT_EXTENSIONS.includes(
      ext as (typeof TELEMAT_IMPORT_EXTENSIONS)[number],
    )
  ) {
    return "Tipo file non supportato. Formati ammessi: CSV, XLS, XLSX, PDF.";
  }
  return null;
}

function statusClass(status: ImportBatch["status"]): string {
  return `telemat-upload-status telemat-upload-status--${status}`;
}

export function TelematUploadPage() {
  const { data: imports = [], isLoading } = useQuery({
    queryKey: ["telemat-imports"],
    queryFn: fetchTelematImports,
    refetchInterval: (query) => {
      const batches = query.state.data ?? [];
      return batches.some((batch) => batch.status === "processing") ? 2000 : false;
    },
  });

  const { sortColumn, sortDirection, handleSort } = useTableSort<ImportBatchSortColumn>(
    "uploaded_at",
    "desc",
    ["tenders_created", "tenders_updated", "file_size", "uploaded_at"],
  );

  const sortedImports = useMemo(
    () => sortImportBatches(imports, sortColumn, sortDirection),
    [imports, sortColumn, sortDirection],
  );

  return (
    <div className="telemat-upload">
      <header className="telemat-upload-header">
        <div>
          <h2>Importa report Telemat</h2>
          <p>
            Carica un export Telemat in CSV, Excel o PDF per creare automaticamente le gare
            importate. I PDF scannerizzati vengono elaborati con OCR.
          </p>
        </div>
        <Link to="/analysis-hub" className="telemat-upload-link">
          Centro Analisi Gare
        </Link>
      </header>

      <ImportUploadPanel
        icon="📊"
        dropzoneText="Trascina il report Telemat qui o clicca per selezionarlo"
        dropzoneHint="CSV, XLS, XLSX, PDF — colonna CIG obbligatoria"
        accept={TELEMAT_IMPORT_ACCEPT}
        validateFile={validateTelematFile}
        upload={uploadTelematReport}
        invalidateQueryKeys={[["telemat-imports"], ["analysis-hub"]]}
        redirectPath="/analysis-hub"
      />

      <section className="telemat-upload-history">
        <h3>Importazioni recenti</h3>

        {isLoading ? (
          <p className="telemat-upload-loading">Caricamento...</p>
        ) : sortedImports.length === 0 ? (
          <p className="telemat-upload-empty">Nessun report Telemat caricato.</p>
        ) : (
          <div className="telemat-upload-table-card">
            <table className="telemat-upload-table">
              <thead>
                <tr>
                  {IMPORT_BATCH_TABLE_COLUMNS.map(({ id, label }) => (
                    <SortableTableHeader
                      key={id}
                      column={id}
                      label={label}
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedImports.map((batch) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
