import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchTenderDocuments } from "../api/tenderDocuments";
import { deleteTender, fetchTender } from "../api/tenders";
import { TenderCompatibility } from "../components/TenderCompatibility";
import { TenderDocuments } from "../components/TenderDocuments";
import { TenderEvaluationCriteria } from "../components/TenderEvaluationCriteria";
import { TenderExportPanel } from "../components/TenderExportPanel";
import { TenderFormalRules } from "../components/TenderFormalRules";
import { TenderRequirements } from "../components/TenderRequirements";
import { TenderTechnicalOffer } from "../components/TenderTechnicalOffer";
import { TENDER_STATO_LABELS } from "../types/tender";
import "./TenderDetail.css";

type TenderTab = "dati" | "documenti" | "requisiti" | "criteri" | "regole" | "compatibilita" | "offerta" | "export";

function formatImporto(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TenderTab>("dati");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ["tenders", tenderId, "documents"],
    queryFn: () => fetchTenderDocuments(tenderId!),
    enabled: tenderId !== null && !Number.isNaN(tenderId),
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      return docs.some((doc) => doc.status === "processing") ? 2000 : false;
    },
  });

  const isProcessingDocuments = documents.some((doc) => doc.status === "processing");

  const { data: tender, isLoading, isError, error } = useQuery({
    queryKey: ["tenders", tenderId],
    queryFn: () => fetchTender(tenderId!),
    enabled: tenderId !== null && !Number.isNaN(tenderId),
    refetchInterval: isProcessingDocuments ? 2000 : false,
  });

  function handleExtractionComplete() {
    queryClient.invalidateQueries({ queryKey: ["tenders", tenderId] });
    queryClient.invalidateQueries({ queryKey: ["tenders", tenderId, "requirements"] });
    queryClient.invalidateQueries({ queryKey: ["tenders", tenderId, "evaluation-criteria"] });
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteTender(tenderId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      navigate("/tenders");
    },
  });

  function handleDeleteConfirm() {
    deleteMutation.mutate();
  }

  if (isLoading) {
    return <p className="tender-detail-loading">Caricamento...</p>;
  }

  if (isError || !tender) {
    return (
      <p className="tender-detail-error">
        Errore: {error instanceof Error ? error.message : "gara non trovata"}
      </p>
    );
  }

  return (
    <div className="tender-detail">
      <header className="tender-detail-header">
        <div>
          <Link to="/tenders" className="tender-detail-back">
            ← Torna alle gare
          </Link>
          <h2>Gara {tender.cig}</h2>
          <p>Dettaglio gara d'appalto</p>
        </div>
        <div className="tender-detail-actions">
          <Link
            to={`/participation/${tender.id}`}
            className="tender-detail-matrix"
          >
            Partecipazione
          </Link>
          <Link
            to={`/requirements-matrix/${tender.id}`}
            className="tender-detail-matrix"
          >
            Matrice requisiti
          </Link>
          <Link to={`/tenders/${tender.id}/edit`} className="tender-detail-edit">
            Modifica
          </Link>
          {confirmDelete ? (
            <div className="tender-detail-delete-confirm">
              <span className="tender-detail-delete-confirm-label">Eliminare questa gara?</span>
              <button
                type="button"
                className="tender-detail-delete-confirm-btn"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Eliminazione..." : "Conferma eliminazione"}
              </button>
              <button
                type="button"
                className="tender-detail-delete-cancel-btn"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tender-detail-delete"
              onClick={() => setConfirmDelete(true)}
            >
              Elimina
            </button>
          )}
        </div>
      </header>

      <nav className="tender-detail-tabs" aria-label="Sezioni gara">
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "dati" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("dati")}
        >
          Dati gara
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "documenti" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("documenti")}
        >
          Documenti
          {isProcessingDocuments && (
            <span className="tender-detail-tab-indicator" aria-label="Elaborazione in corso" />
          )}
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "requisiti" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("requisiti")}
        >
          Requisiti
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "criteri" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("criteri")}
        >
          Criteri valutazione
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "regole" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("regole")}
        >
          Regole formali
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "compatibilita" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("compatibilita")}
        >
          Compatibilità
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "offerta" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("offerta")}
        >
          Offerta tecnica
        </button>
        <button
          type="button"
          className={`tender-detail-tab${activeTab === "export" ? " tender-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("export")}
        >
          Esporta
        </button>
      </nav>

      {activeTab === "dati" && (
      <section className="tender-detail-card">
        <div className="tender-detail-card-header">
          <h3>Dati gara</h3>
          {tender.ai_extracted && (
            <span className="tender-detail-ai-badge">estratto AI</span>
          )}
        </div>
        {tender.ai_extracted && tender.extracted_at && (
          <p className="tender-detail-extracted-note">
            Metadati aggiornati automaticamente dall&apos;analisi dei documenti il{" "}
            {formatDate(tender.extracted_at)}.
          </p>
        )}
        <dl className="tender-detail-fields">
          <div>
            <dt>CIG</dt>
            <dd>{tender.cig}</dd>
          </div>
          <div>
            <dt>CPV</dt>
            <dd>{tender.cpv}</dd>
          </div>
          <div>
            <dt>Importo</dt>
            <dd>{formatImporto(tender.importo)}</dd>
          </div>
          <div>
            <dt>Scadenza</dt>
            <dd>{formatDate(tender.scadenza)}</dd>
          </div>
          <div>
            <dt>Stato</dt>
            <dd>
              <span className={`tender-detail-badge tender-detail-badge--${tender.stato}`}>
                {TENDER_STATO_LABELS[tender.stato]}
              </span>
            </dd>
          </div>
          <div>
            <dt>Creata il</dt>
            <dd>{formatDate(tender.created_at)}</dd>
          </div>
          <div>
            <dt>Ultimo aggiornamento</dt>
            <dd>{formatDate(tender.updated_at)}</dd>
          </div>
        </dl>
      </section>
      )}

      {activeTab === "documenti" && (
      <TenderDocuments
        tenderId={tender.id}
        onExtractionComplete={handleExtractionComplete}
      />
      )}

      {activeTab === "requisiti" && (
      <TenderRequirements
        tenderId={tender.id}
        isProcessing={isProcessingDocuments}
      />
      )}

      {activeTab === "criteri" && (
      <TenderEvaluationCriteria
        tenderId={tender.id}
        isProcessing={isProcessingDocuments}
      />
      )}

      {activeTab === "regole" && (
      <TenderFormalRules
        tenderId={tender.id}
        formalRules={tender.formal_rules}
        isProcessing={isProcessingDocuments}
      />
      )}

      {activeTab === "compatibilita" && (
      <TenderCompatibility tenderId={tender.id} />
      )}

      {activeTab === "offerta" && (
      <TenderTechnicalOffer tenderId={tender.id} />
      )}

      {activeTab === "export" && (
        <TenderExportPanel tenderId={tender.id} cig={tender.cig} />
      )}
    </div>
  );
}
