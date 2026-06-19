import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { importTechnicalOffers } from "../api/technicalOffers";
import {
  TECHNICAL_OFFER_CATEGORIES,
  TECHNICAL_OFFER_SETTORI,
  type TechnicalOfferCategory,
  type TechnicalOfferSettore,
  type TechnicalOfferSplitMode,
} from "../types/technicalOffer";
import "./TechnicalOffersImportPanel.css";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];

function isAllowedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface TechnicalOffersImportPanelProps {
  onImported?: () => void;
}

export function TechnicalOffersImportPanel({ onImported }: TechnicalOffersImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<TechnicalOfferCategory>("altro");
  const [settore, setSettore] = useState<TechnicalOfferSettore>("");
  const [ente, setEnte] = useState("");
  const [splitMode, setSplitMode] = useState<TechnicalOfferSplitMode>("auto");
  const [feedback, setFeedback] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: importTechnicalOffers,
    onSuccess: (response) => {
      const errors = response.results.filter((item) => item.error);
      if (response.created_count > 0) {
        setFeedback(
          `Importati ${response.created_count} contenuti da ${response.files_count} file.` +
            (errors.length ? ` ${errors.length} file con errori.` : ""),
        );
        setSelectedFiles([]);
        onImported?.();
      } else {
        setFeedback(errors[0]?.error || "Nessun contenuto importato.");
      }
    },
    onError: () => {
      setFeedback("Importazione non riuscita. Verifica i file e riprova.");
    },
  });

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter(isAllowedFile);
    if (!incoming.length) {
      setFeedback("Carica solo file PDF, DOCX o DOC.");
      return;
    }
    setFeedback(null);
    setSelectedFiles((current) => {
      const names = new Set(current.map((file) => file.name));
      return [...current, ...incoming.filter((file) => !names.has(file.name))];
    });
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
    }
  }

  return (
    <section className="technical-offers-import">
      <div className="technical-offers-import-header">
        <div>
          <h3>Importa da file</h3>
          <p>
            Carica PDF o DOCX di offerte passate. Il testo viene estratto e suddiviso in
            contenuti riutilizzabili.
          </p>
        </div>
      </div>

      <div className="technical-offers-import-options">
        <label>
          Categoria predefinita
          <select value={category} onChange={(e) => setCategory(e.target.value as TechnicalOfferCategory)}>
            {TECHNICAL_OFFER_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Settore
          <select value={settore} onChange={(e) => setSettore(e.target.value as TechnicalOfferSettore)}>
            {TECHNICAL_OFFER_SETTORI.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ente appaltante
          <input
            type="text"
            value={ente}
            onChange={(e) => setEnte(e.target.value)}
            placeholder="Es. Comune di Brescia"
          />
        </label>
        <label>
          Suddivisione
          <select value={splitMode} onChange={(e) => setSplitMode(e.target.value as TechnicalOfferSplitMode)}>
            <option value="auto">Automatica (titoli nel documento)</option>
            <option value="single">Un contenuto per file</option>
            <option value="by_heading">Forza suddivisione per titoli</option>
          </select>
        </label>
      </div>

      <div
        className={`technical-offers-import-dropzone${isDragging ? " technical-offers-import-dropzone--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <strong>Trascina qui i file oppure clicca per selezionarli</strong>
        <span>PDF, DOCX, DOC — import multiplo supportato</span>
      </div>

      {selectedFiles.length > 0 && (
        <ul className="technical-offers-import-files">
          {selectedFiles.map((file) => (
            <li key={file.name}>
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))}
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="technical-offers-import-actions">
        <button
          type="button"
          className="technical-offers-import-submit"
          disabled={!selectedFiles.length || importMutation.isPending}
          onClick={() =>
            importMutation.mutate({
              files: selectedFiles,
              category,
              settore,
              ente_appaltante: ente,
              split_mode: splitMode,
            })
          }
        >
          {importMutation.isPending ? "Importazione..." : `Importa ${selectedFiles.length || ""} file`}
        </button>
      </div>

      {feedback && <p className="technical-offers-import-feedback">{feedback}</p>}
    </section>
  );
}
