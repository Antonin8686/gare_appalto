import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { downloadTenderExport, fetchTenderExportOptions } from "../api/tenderExport";
import {
  TENDER_EXPORT_FORMAT_LABELS,
  TENDER_EXPORT_ITEM_LABELS,
  type TenderExportFormat,
  type TenderExportItem,
} from "../types/tenderExport";
import "./TenderExportPanel.css";

const ALL_ITEMS: TenderExportItem[] = [
  "scheda_gara",
  "matrice_requisiti",
  "report_partecipabilita",
  "relazione_tecnica",
];

interface TenderExportPanelProps {
  tenderId: number;
  cig: string;
}

export function TenderExportPanel({ tenderId, cig }: TenderExportPanelProps) {
  const [format, setFormat] = useState<TenderExportFormat>("docx");
  const [selectedItems, setSelectedItems] = useState<TenderExportItem[]>([...ALL_ITEMS]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: options, isLoading } = useQuery({
    queryKey: ["tenders", tenderId, "export-options"],
    queryFn: () => fetchTenderExportOptions(tenderId),
  });

  const exportMutation = useMutation({
    mutationFn: (payload: Parameters<typeof downloadTenderExport>[1]) =>
      downloadTenderExport(tenderId, payload),
    onSuccess: () => setErrorMessage(null),
    onError: async (error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: Blob } }).response?.data instanceof Blob
      ) {
        try {
          const text = await (error as { response: { data: Blob } }).response.data.text();
          const parsed = JSON.parse(text) as { detail?: string };
          setErrorMessage(parsed.detail ?? "Errore durante l'esportazione.");
          return;
        } catch {
          // fall through
        }
      }
      setErrorMessage("Errore durante l'esportazione.");
    },
  });

  function toggleItem(item: TenderExportItem) {
    setSelectedItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  function handleExportSelected() {
    if (selectedItems.length === 0) {
      setErrorMessage("Seleziona almeno un documento.");
      return;
    }
    exportMutation.mutate({
      items: selectedItems,
      format,
      bundle: false,
    });
  }

  function handleExportBundle() {
    exportMutation.mutate({
      format,
      bundle: true,
    });
  }

  if (isLoading) {
    return <p className="tender-export-panel__loading">Caricamento opzioni export...</p>;
  }

  return (
    <section className="tender-export-panel">
      <header className="tender-export-panel__header">
        <div>
          <h3>Esportazione professionale</h3>
          <p>
            Genera documenti per la gara <strong>{cig}</strong> in formati compatibili con
            Microsoft Office e LibreOffice.
          </p>
        </div>
      </header>

      <div className="tender-export-panel__format">
        <span className="tender-export-panel__label">Formato</span>
        <div className="tender-export-panel__format-options">
          {(options?.formats ?? ["docx", "pdf", "xlsx"]).map((value) => (
            <label key={value} className="tender-export-panel__format-option">
              <input
                type="radio"
                name="export-format"
                value={value}
                checked={format === value}
                onChange={() => setFormat(value as TenderExportFormat)}
              />
              {TENDER_EXPORT_FORMAT_LABELS[value as TenderExportFormat]}
            </label>
          ))}
        </div>
        {options?.compatibility?.[format] && (
          <p className="tender-export-panel__compat">
            Compatibile con: {options.compatibility[format]}
          </p>
        )}
      </div>

      <div className="tender-export-panel__items">
        <span className="tender-export-panel__label">Documenti</span>
        <div className="tender-export-panel__item-grid">
          {ALL_ITEMS.map((item) => (
            <label key={item} className="tender-export-panel__item">
              <input
                type="checkbox"
                checked={selectedItems.includes(item)}
                onChange={() => toggleItem(item)}
              />
              <span>{TENDER_EXPORT_ITEM_LABELS[item]}</span>
            </label>
          ))}
        </div>
      </div>

      {errorMessage && <p className="tender-export-panel__error">{errorMessage}</p>}

      <div className="tender-export-panel__actions">
        <button
          type="button"
          className="tender-export-panel__button tender-export-panel__button--primary"
          disabled={exportMutation.isPending || selectedItems.length === 0}
          onClick={handleExportSelected}
        >
          {exportMutation.isPending ? "Esportazione..." : "Scarica selezionati"}
        </button>
        <button
          type="button"
          className="tender-export-panel__button tender-export-panel__button--bundle"
          disabled={exportMutation.isPending}
          onClick={handleExportBundle}
        >
          {exportMutation.isPending ? "Esportazione..." : "Scarica fascicolo completo (ZIP)"}
        </button>
      </div>

      <p className="tender-export-panel__note">
        Il fascicolo completo include tutti e 4 i documenti nel formato scelto, compressi in un
        archivio ZIP. Con più documenti selezionati viene generato automaticamente un ZIP.
      </p>
    </section>
  );
}
