import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  deleteCompanyDocument,
  downloadCompanyDocument,
  fetchCompanyDocuments,
  fetchExpiringCompanyDocuments,
  uploadCompanyDocument,
} from "../api/companyDocuments";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import { compareOptionalStrings, compareStrings, sortRows } from "../utils/tableSort";
import {
  ALLOWED_COMPANY_DOCUMENT_ACCEPT,
  ALLOWED_COMPANY_DOCUMENT_EXTENSIONS,
  COMPANY_DOCUMENT_CATEGORIA_LABELS,
  COMPANY_DOCUMENT_CATEGORIE,
  COMPANY_DOCUMENT_STATO_LABELS,
  type CompanyDocument,
  type CompanyDocumentCategoria,
  type CompanyDocumentStatoValidita,
} from "../types/companyDocument";
import "./CompanyDocuments.css";

type SortColumn = "file" | "categoria" | "rilascio" | "scadenza" | "validita";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "file", label: "File" },
  { id: "categoria", label: "Categoria" },
  { id: "rilascio", label: "Rilascio" },
  { id: "scadenza", label: "Scadenza" },
  { id: "validita", label: "Validità" },
];

const VALIDITA_ORDER: Record<CompanyDocumentStatoValidita, number> = {
  valido: 0,
  in_scadenza: 1,
  scaduto: 2,
  senza_scadenza: 3,
};

function compareCompanyDocuments(
  a: CompanyDocument,
  b: CompanyDocument,
  column: SortColumn,
): number {
  switch (column) {
    case "file":
      return compareStrings(a.original_filename, b.original_filename);
    case "categoria":
      return compareStrings(a.categoria, b.categoria);
    case "rilascio":
      return compareOptionalStrings(a.data_rilascio, b.data_rilascio);
    case "scadenza":
      return compareOptionalStrings(a.data_scadenza, b.data_scadenza);
    case "validita":
      return (
        (VALIDITA_ORDER[a.stato_validita] ?? 0) - (VALIDITA_ORDER[b.stato_validita] ?? 0)
      );
  }
}

interface CompanyDocumentsProps {
  companyId: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isAllowedFile(file: File): boolean {
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  return ALLOWED_COMPANY_DOCUMENT_EXTENSIONS.includes(
    ext as (typeof ALLOWED_COMPANY_DOCUMENT_EXTENSIONS)[number],
  );
}

function validityClass(stato: CompanyDocumentStatoValidita): string {
  return `company-documents-validity company-documents-validity--${stato}`;
}

function scadenzaClass(stato: CompanyDocumentStatoValidita): string {
  if (stato === "scaduto") return "company-documents-scadenza company-documents-scadenza--scaduto";
  if (stato === "in_scadenza") {
    return "company-documents-scadenza company-documents-scadenza--warning";
  }
  return "company-documents-scadenza";
}

export function CompanyDocuments({ companyId }: CompanyDocumentsProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<CompanyDocumentCategoria | "">("");
  const [statoFilter, setStatoFilter] = useState<CompanyDocumentStatoValidita | "">("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadCategoria, setUploadCategoria] =
    useState<CompanyDocumentCategoria>("personalizzato");
  const [uploadRilascio, setUploadRilascio] = useState("");
  const [uploadScadenza, setUploadScadenza] = useState("");
  const [uploadNote, setUploadNote] = useState("");

  const filters = useMemo(
    () => ({
      q: searchQuery,
      categoria: categoriaFilter,
      stato_validita: statoFilter,
    }),
    [searchQuery, categoriaFilter, statoFilter],
  );

  const documentsQuery = useQuery({
    queryKey: ["companies", companyId, "documents", filters],
    queryFn: () => fetchCompanyDocuments(companyId, filters),
  });

  const expiringQuery = useQuery({
    queryKey: ["companies", companyId, "documents", "expiring"],
    queryFn: () => fetchExpiringCompanyDocuments({ companyId, days: 30 }),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!pendingFile) {
        throw new Error("Seleziona un file da caricare.");
      }
      return uploadCompanyDocument(companyId, {
        file: pendingFile,
        categoria: uploadCategoria,
        data_rilascio: uploadRilascio || null,
        data_scadenza: uploadScadenza || null,
        note: uploadNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", companyId, "documents"] });
      setUploadError(null);
      setPendingFile(null);
      setUploadRilascio("");
      setUploadScadenza("");
      setUploadNote("");
      setUploadCategoria("personalizzato");
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Errore durante il caricamento.";
      setUploadError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => deleteCompanyDocument(companyId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", companyId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["companies", companyId, "documents", "expiring"] });
    },
  });

  const documents = documentsQuery.data ?? [];
  const expiringCount = expiringQuery.data?.count ?? 0;

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>(
    "scadenza",
    "asc",
    ["scadenza"],
  );

  const sortedDocuments = useMemo(
    () =>
      sortRows(documents, sortColumn, sortDirection, compareCompanyDocuments, (a, b) =>
        compareStrings(a.original_filename, b.original_filename),
      ),
    [documents, sortColumn, sortDirection],
  );

  function assignPendingFile(file: File) {
    if (!isAllowedFile(file)) {
      setUploadError(
        "Tipo file non supportato. Formati ammessi: PDF, DOC/DOCX, XLS/XLSX, immagini.",
      );
      return;
    }
    setUploadError(null);
    setPendingFile(file);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    assignPendingFile(files[0]);
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

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleDownload(document: CompanyDocument) {
    setDownloadingId(document.id);
    try {
      await downloadCompanyDocument(companyId, document);
    } finally {
      setDownloadingId(null);
    }
  }

  function handleDelete(document: CompanyDocument) {
    if (
      window.confirm(
        `Eliminare il documento "${document.original_filename}"? L'operazione non è reversibile.`,
      )
    ) {
      deleteMutation.mutate(document.id);
    }
  }

  return (
    <section className="company-documents">
      {expiringCount > 0 && (
        <div className="company-documents-alert" role="status">
          <strong>Attenzione:</strong> {expiringCount}{" "}
          {expiringCount === 1 ? "documento in scadenza o scaduto" : "documenti in scadenza o scaduti"}{" "}
          nei prossimi 30 giorni.
        </div>
      )}

      <div className="company-documents-card">
        <header className="company-documents-header">
          <div>
            <h3>Documenti aziendali</h3>
            <p>Archivio documenti amministrativi con controllo scadenze e validità.</p>
          </div>
        </header>

        <div className="company-documents-filters">
          <label className="company-documents-filter">
            <span>Cerca</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nome file o note..."
            />
          </label>
          <label className="company-documents-filter">
            <span>Categoria</span>
            <select
              value={categoriaFilter}
              onChange={(e) =>
                setCategoriaFilter(e.target.value as CompanyDocumentCategoria | "")
              }
            >
              <option value="">Tutte</option>
              {COMPANY_DOCUMENT_CATEGORIE.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="company-documents-filter">
            <span>Validità</span>
            <select
              value={statoFilter}
              onChange={(e) =>
                setStatoFilter(e.target.value as CompanyDocumentStatoValidita | "")
              }
            >
              <option value="">Tutti</option>
              {(
                Object.entries(COMPANY_DOCUMENT_STATO_LABELS) as [
                  CompanyDocumentStatoValidita,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className={`company-documents-dropzone${
            isDragging ? " company-documents-dropzone--active" : ""
          }${uploadMutation.isPending ? " company-documents-dropzone--uploading" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="company-documents-dropzone-icon" aria-hidden>
            📄
          </div>
          <p className="company-documents-dropzone-text">
            {pendingFile
              ? `File selezionato: ${pendingFile.name}`
              : "Trascina un documento qui o clicca per selezionarlo"}
          </p>
          <p className="company-documents-dropzone-hint">
            PDF, DOC/DOCX, XLS/XLSX, immagini — max consigliato 25 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            className="company-documents-input"
            accept={ALLOWED_COMPANY_DOCUMENT_ACCEPT}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="company-documents-upload-meta">
          <label>
            Categoria
            <select
              value={uploadCategoria}
              onChange={(e) =>
                setUploadCategoria(e.target.value as CompanyDocumentCategoria)
              }
            >
              {COMPANY_DOCUMENT_CATEGORIE.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data rilascio
            <input
              type="date"
              value={uploadRilascio}
              onChange={(e) => setUploadRilascio(e.target.value)}
            />
          </label>
          <label>
            Data scadenza
            <input
              type="date"
              value={uploadScadenza}
              onChange={(e) => setUploadScadenza(e.target.value)}
            />
          </label>
          <label className="company-documents-upload-note">
            Note
            <input
              type="text"
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="Note opzionali"
            />
          </label>
          <button
            type="button"
            className="company-documents-upload-btn"
            disabled={!pendingFile || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? "Caricamento..." : "Carica documento"}
          </button>
        </div>

        {uploadError && <p className="company-documents-error">{uploadError}</p>}

        {documentsQuery.isLoading ? (
          <p className="company-documents-loading">Caricamento documenti...</p>
        ) : documents.length === 0 ? (
          <p className="company-documents-empty">Nessun documento trovato.</p>
        ) : (
          <div className="company-documents-table-card">
            <table className="company-documents-table">
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
                  <th aria-label="Azioni" />
                </tr>
              </thead>
              <tbody>
                {sortedDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <div className="company-documents-file">
                        <strong>{document.original_filename}</strong>
                        <span>{formatFileSize(document.file_size)}</span>
                        {document.note && (
                          <span className="company-documents-file-note">{document.note}</span>
                        )}
                      </div>
                    </td>
                    <td>{COMPANY_DOCUMENT_CATEGORIA_LABELS[document.categoria]}</td>
                    <td>{formatDate(document.data_rilascio)}</td>
                    <td className={scadenzaClass(document.stato_validita)}>
                      {formatDate(document.data_scadenza)}
                      {document.giorni_alla_scadenza !== null && (
                        <span className="company-documents-days">
                          {document.giorni_alla_scadenza < 0
                            ? `Scaduto da ${Math.abs(document.giorni_alla_scadenza)} gg`
                            : document.giorni_alla_scadenza === 0
                              ? "Scade oggi"
                              : `${document.giorni_alla_scadenza} gg`}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={validityClass(document.stato_validita)}>
                        {COMPANY_DOCUMENT_STATO_LABELS[document.stato_validita]}
                      </span>
                    </td>
                    <td>
                      <div className="company-documents-actions">
                        <button
                          type="button"
                          className="company-documents-action"
                          onClick={() => handleDownload(document)}
                          disabled={downloadingId === document.id}
                        >
                          {downloadingId === document.id ? "..." : "Scarica"}
                        </button>
                        <button
                          type="button"
                          className="company-documents-action company-documents-action--danger"
                          onClick={() => handleDelete(document)}
                          disabled={deleteMutation.isPending}
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
