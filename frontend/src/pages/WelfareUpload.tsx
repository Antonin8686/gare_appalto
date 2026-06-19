import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  deleteWelfareImport,
  fetchWelfareImport,
  fetchWelfareImports,
  uploadWelfareReport,
} from "../api/imports";
import { ImportHistoryTable } from "../components/ImportHistoryTable";
import { ImportUploadPanel } from "../components/ImportUploadPanel";
import { useTableSort } from "../hooks/useTableSort";
import { ALLOWED_IMPORT_ACCEPT, ALLOWED_IMPORT_EXTENSIONS } from "../types/import";
import { sortImportBatches, type ImportBatchSortColumn } from "../utils/sortImportBatches";
import "./TelematUpload.css";

function validateWelfareFile(file: File): string | null {
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  if (
    !ALLOWED_IMPORT_EXTENSIONS.includes(
      ext as (typeof ALLOWED_IMPORT_EXTENSIONS)[number],
    )
  ) {
    return "Tipo file non supportato. Formati ammessi: CSV, XLS, XLSX.";
  }
  return null;
}

export function WelfareUploadPage() {
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

      <ImportUploadPanel
        icon="📋"
        dropzoneText="Trascina il report Welfare qui o clicca per selezionarlo"
        dropzoneHint="CSV, XLS, XLSX — CIG obbligatorio; opzionali link documentazione e stazione appaltante"
        accept={ALLOWED_IMPORT_ACCEPT}
        validateFile={validateWelfareFile}
        upload={uploadWelfareReport}
        fetchImport={fetchWelfareImport}
        invalidateQueryKeys={[["welfare-imports"], ["analysis-hub"]]}
        redirectPath="/analysis-hub"
      />

      <section className="telemat-upload-history">
        <h3>Importazioni recenti</h3>

        {isLoading ? (
          <p className="telemat-upload-loading">Caricamento...</p>
        ) : sortedImports.length === 0 ? (
          <p className="telemat-upload-empty">Nessun report Welfare caricato.</p>
        ) : (
          <ImportHistoryTable
            batches={sortedImports}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            deleteImport={deleteWelfareImport}
            invalidateQueryKeys={[["welfare-imports"], ["analysis-hub"]]}
            createdColumnLabel="Create"
          />
        )}
      </section>
    </div>
  );
}
