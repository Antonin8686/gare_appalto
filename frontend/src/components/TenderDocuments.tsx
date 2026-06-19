import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteTenderDocument,
  downloadTenderDocument,
  fetchTenderDocuments,
  uploadTenderDocument,
} from "../api/tenderDocuments";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import { formatApiError } from "../utils/apiError";
import { compareNumbers, compareStrings, sortRows } from "../utils/tableSort";
import {
  ALLOWED_DOCUMENT_ACCEPT,
  ALLOWED_DOCUMENT_EXTENSIONS,
  DOCUMENT_STATUS_LABELS,
  type TenderDocument,
} from "../types/tenderDocument";
import "./TenderDocuments.css";

type SortColumn = "name" | "status" | "file_size" | "uploaded_at";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "name", label: "Nome" },
  { id: "status", label: "Stato" },
  { id: "file_size", label: "Dimensione" },
  { id: "uploaded_at", label: "Caricato il" },
];

const STATUS_ORDER: Record<TenderDocument["status"], number> = {
  processing: 0,
  done: 1,
  failed: 2,
};

function compareDocuments(a: TenderDocument, b: TenderDocument, column: SortColumn): number {
  switch (column) {
    case "name":
      return compareStrings(a.name, b.name);
    case "status":
      return (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    case "file_size":
      return compareNumbers(a.file_size, b.file_size);
    case "uploaded_at":
      return compareStrings(a.uploaded_at, b.uploaded_at);
  }
}

interface TenderDocumentsProps {
  tenderId: number;
  onExtractionComplete?: () => void;
}

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
  return ALLOWED_DOCUMENT_EXTENSIONS.includes(
    ext as (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number],
  );
}

function statusClass(status: TenderDocument["status"]): string {
  return `tender-documents-status tender-documents-status--${status}`;
}

function documentIssues(doc: TenderDocument): string[] {
  if (doc.validation_issues?.length) return doc.validation_issues;
  if (doc.error_message?.trim()) return [doc.error_message];
  if (doc.status === "failed") {
    return ["Recupero del dettaglio errore in corso…"];
  }
  return [];
}

export function TenderDocuments({ tenderId, onExtractionComplete }: TenderDocumentsProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const wasProcessingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["tenders", tenderId, "documents"],
    queryFn: () => fetchTenderDocuments(tenderId),
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      return docs.some((doc) => doc.status === "processing") ? 3000 : false;
    },
  });

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>(
    "uploaded_at",
    "desc",
    ["file_size", "uploaded_at"],
  );

  const sortedDocuments = useMemo(
    () =>
      sortRows(documents, sortColumn, sortDirection, compareDocuments, (a, b) =>
        compareStrings(a.name, b.name),
      ),
    [documents, sortColumn, sortDirection],
  );

  useEffect(() => {
    const isProcessing = documents.some((doc) => doc.status === "processing");
    if (wasProcessingRef.current && !isProcessing) {
      onExtractionComplete?.();
    }
    wasProcessingRef.current = isProcessing;
  }, [documents, onExtractionComplete]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadTenderDocument(tenderId, file),
    onSuccess: (uploaded) => {
      queryClient.setQueryData<TenderDocument[]>(
        ["tenders", tenderId, "documents"],
        (current = []) => [uploaded, ...current.filter((doc) => doc.id !== uploaded.id)],
      );
      if (uploaded.status === "done") {
        onExtractionComplete?.();
      }
      if (uploaded.status === "failed" && uploaded.validation_issues.length > 1) {
        setExpandedErrorId(uploaded.id);
      }
      setUploadError(null);
    },
    onError: (error: unknown) => {
      setUploadError(formatApiError(error, "Errore durante il caricamento."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => deleteTenderDocument(tenderId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders", tenderId, "documents"] });
    },
  });

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!isAllowedFile(file)) {
      setUploadError(
        "Tipo file non supportato. Formati ammessi: PDF, DOC/DOCX, XLS/XLSX, immagini.",
      );
      return;
    }

    uploadMutation.mutate(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDownload(documentId: number) {
    const document = documents.find((doc) => doc.id === documentId);
    if (!document) return;

    setDownloadingId(documentId);
    try {
      await downloadTenderDocument(tenderId, document);
    } finally {
      setDownloadingId(null);
    }
  }

  function handleDelete(documentId: number) {
    if (confirmDeleteId === documentId) {
      deleteMutation.mutate(documentId, {
        onSettled: () => setConfirmDeleteId(null),
      });
      return;
    }
    setConfirmDeleteId(documentId);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  const dropzoneClass = [
    "tender-documents-dropzone",
    isDragging ? "tender-documents-dropzone--active" : "",
    uploadMutation.isPending ? "tender-documents-dropzone--uploading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="tender-documents">
      <div className="tender-documents-card">
        <div className="tender-documents-header">
          <h3>Documenti</h3>
          <p>Carica PDF, Word, Excel o immagini collegati a questa gara.</p>
        </div>

        <div
          className={dropzoneClass}
          onClick={() => !uploadMutation.isPending && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="tender-documents-dropzone-icon">📄</div>
          <p className="tender-documents-dropzone-text">
            {uploadMutation.isPending
              ? "Caricamento e analisi in corso..."
              : "Trascina un file qui o clicca per selezionarlo"}
          </p>
          <p className="tender-documents-dropzone-hint">
            PDF, DOC/DOCX, XLS/XLSX, JPG, PNG, GIF, WEBP
          </p>
          <input
            ref={inputRef}
            type="file"
            className="tender-documents-input"
            accept={ALLOWED_DOCUMENT_ACCEPT}
            onChange={(event) => handleFiles(event.target.files)}
            disabled={uploadMutation.isPending}
          />
        </div>

        {uploadError && <p className="tender-documents-error">{uploadError}</p>}

        {isLoading ? (
          <p className="tender-documents-loading">Caricamento documenti...</p>
        ) : documents.length === 0 ? (
          <p className="tender-documents-empty">Nessun documento caricato.</p>
        ) : (
          <div className="tender-documents-table-card">
            <table className="tender-documents-table">
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
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedDocuments.map((doc) => {
                  const issues = documentIssues(doc);
                  const isConfirmingDelete = confirmDeleteId === doc.id;

                  return (
                  <Fragment key={doc.id}>
                    <tr className={issues.length ? "tender-documents-row--failed" : undefined}>
                      <td>
                        {doc.name}
                        <span className="tender-documents-filename">{doc.original_filename}</span>
                      </td>
                      <td>
                        <span className={statusClass(doc.status)}>
                          {doc.status === "processing" && (
                            <span className="tender-documents-status-spinner" aria-hidden />
                          )}
                          {DOCUMENT_STATUS_LABELS[doc.status]}
                        </span>
                        {doc.status === "failed" && issues.length > 0 && (
                          <div className="tender-documents-error-summary">
                            <p>{issues[0]}</p>
                            {issues.length > 1 && (
                              <button
                                type="button"
                                className="tender-documents-error-toggle"
                                onClick={() =>
                                  setExpandedErrorId(expandedErrorId === doc.id ? null : doc.id)
                                }
                              >
                                {expandedErrorId === doc.id
                                  ? "Nascondi dettagli"
                                  : `Mostra tutti i problemi (${issues.length})`}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td>{formatFileSize(doc.file_size)}</td>
                      <td>{formatDate(doc.uploaded_at)}</td>
                      <td>
                        <div className="tender-documents-actions">
                          {doc.status === "done" && doc.text_content && (
                            <button
                              type="button"
                              className="tender-documents-text-toggle"
                              onClick={() =>
                                setExpandedId(expandedId === doc.id ? null : doc.id)
                              }
                            >
                              {expandedId === doc.id ? "Nascondi testo" : "Mostra testo"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="tender-documents-download"
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadingId === doc.id}
                          >
                            {downloadingId === doc.id ? "..." : "Scarica"}
                          </button>
                          {isConfirmingDelete ? (
                            <>
                              <button
                                type="button"
                                className="tender-documents-delete tender-documents-delete--confirm"
                                onClick={() => handleDelete(doc.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? "Eliminazione..." : "Conferma"}
                              </button>
                              <button
                                type="button"
                                className="tender-documents-cancel"
                                onClick={cancelDelete}
                                disabled={deleteMutation.isPending}
                              >
                                Annulla
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="tender-documents-delete"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Elimina
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedErrorId === doc.id && issues.length > 0 && (
                      <tr className="tender-documents-error-row">
                        <td colSpan={5}>
                          <div className="tender-documents-error-detail">
                            <h4>Problemi rilevati</h4>
                            <ul>
                              {issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedId === doc.id && doc.text_content && (
                      <tr className="tender-documents-text-row">
                        <td colSpan={5}>
                          <div className="tender-documents-text-preview">
                            <h4>Testo estratto</h4>
                            <pre>{doc.text_content}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
