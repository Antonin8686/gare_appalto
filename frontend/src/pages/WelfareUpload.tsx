import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWelfareImports, uploadWelfareReport } from "../api/imports";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import {
  ALLOWED_IMPORT_ACCEPT,
  ALLOWED_IMPORT_EXTENSIONS,
  IMPORT_STATUS_LABELS,
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

function isAllowedFile(file: File): boolean {
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  return ALLOWED_IMPORT_EXTENSIONS.includes(
    ext as (typeof ALLOWED_IMPORT_EXTENSIONS)[number],
  );
}

function statusClass(status: ImportBatch["status"]): string {
  return `telemat-upload-status telemat-upload-status--${status}`;
}

export function WelfareUploadPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: imports = [], isLoading } = useQuery({
    queryKey: ["welfare-imports"],
    queryFn: fetchWelfareImports,
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

  const uploadMutation = useMutation({
    mutationFn: uploadWelfareReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welfare-imports"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-hub"] });
      setUploadError(null);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Errore durante il caricamento.";
      setUploadError(message);
    },
  });

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!isAllowedFile(file)) {
      setUploadError("Tipo file non supportato. Formati ammessi: CSV, XLS, XLSX.");
      return;
    }

    uploadMutation.mutate(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  const dropzoneClass = [
    "telemat-upload-dropzone",
    isDragging ? "telemat-upload-dropzone--active" : "",
    uploadMutation.isPending ? "telemat-upload-dropzone--uploading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="telemat-upload">
      <header className="telemat-upload-header">
        <div>
          <h2>Importa report Welfare</h2>
          <p>
            Carica un export Welfare in CSV o Excel. Le gare già presenti vengono aggiornate
            e viene conservato lo storico delle rilevazioni.
          </p>
        </div>
        <Link to="/analysis-hub" className="telemat-upload-link">
          Centro Analisi Gare
        </Link>
      </header>

      <section className="telemat-upload-card">
        <div
          className={dropzoneClass}
          onClick={() => !uploadMutation.isPending && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="telemat-upload-dropzone-icon">📋</div>
          <p className="telemat-upload-dropzone-text">
            {uploadMutation.isPending
              ? "Caricamento in corso..."
              : "Trascina il report Welfare qui o clicca per selezionarlo"}
          </p>
          <p className="telemat-upload-dropzone-hint">
            CSV, XLS, XLSX — CIG obbligatorio; opzionali link documentazione e stazione appaltante
          </p>
          <input
            ref={inputRef}
            type="file"
            className="telemat-upload-input"
            accept={ALLOWED_IMPORT_ACCEPT}
            onChange={(event) => handleFiles(event.target.files)}
            disabled={uploadMutation.isPending}
          />
        </div>

        {uploadError && <p className="telemat-upload-error">{uploadError}</p>}
      </section>

      <section className="telemat-upload-history">
        <h3>Importazioni recenti</h3>

        {isLoading ? (
          <p className="telemat-upload-loading">Caricamento...</p>
        ) : sortedImports.length === 0 ? (
          <p className="telemat-upload-empty">Nessun report Welfare caricato.</p>
        ) : (
          <div className="telemat-upload-table-card">
            <table className="telemat-upload-table">
              <thead>
                <tr>
                  {IMPORT_BATCH_TABLE_COLUMNS.map(({ id, label }) => (
                    <SortableTableHeader
                      key={id}
                      column={id}
                      label={id === "tenders_created" ? "Create" : label}
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
