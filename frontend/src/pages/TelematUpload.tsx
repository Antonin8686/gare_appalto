import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  deleteTelematImport,
  fetchTelematImport,
  fetchTelematImports,
  uploadTelematReport,
} from "../api/imports";
import { ImportHistoryTable } from "../components/ImportHistoryTable";
import { ImportUploadPanel } from "../components/ImportUploadPanel";
import { useTableSort } from "../hooks/useTableSort";
import { TELEMAT_IMPORT_ACCEPT, TELEMAT_IMPORT_EXTENSIONS } from "../types/import";
import { sortImportBatches, type ImportBatchSortColumn } from "../utils/sortImportBatches";
import "./TelematUpload.css";

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
        fetchImport={fetchTelematImport}
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
          <ImportHistoryTable
            batches={sortedImports}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            deleteImport={deleteTelematImport}
            invalidateQueryKeys={[["telemat-imports"], ["analysis-hub"]]}
          />
        )}
      </section>
    </div>
  );
}
