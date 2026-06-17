import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchImportedTenders } from "../api/tenders";
import { PriorityBadge } from "../components/PriorityBadge";
import { TENDER_SOURCE_LABELS, TENDER_STATO_LABELS } from "../types/tender";
import "./ImportedTendersList.css";

function formatImporto(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatScadenza(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ImportedTendersListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["imported-tenders"],
    queryFn: fetchImportedTenders,
  });

  return (
    <div className="imported-tenders">
      <header className="imported-tenders-header">
        <div>
          <h2>Gare importate</h2>
          <p>Gare create da import Scouting o report Telemat.</p>
        </div>
        <div className="imported-tenders-actions">
          <Link to="/scouting" className="imported-tenders-btn imported-tenders-btn--secondary">
            Dashboard Scouting
          </Link>
          <Link to="/imports/telemat" className="imported-tenders-btn imported-tenders-btn--secondary">
            Importa Telemat
          </Link>
          <Link to="/tenders" className="imported-tenders-btn">
            Tutte le gare
          </Link>
        </div>
      </header>

      {isLoading && <p className="imported-tenders-loading">Caricamento...</p>}

      {isError && (
        <p className="imported-tenders-error">
          Errore: {error instanceof Error ? error.message : "impossibile caricare le gare"}
        </p>
      )}

      {data && data.length === 0 && (
        <section className="imported-tenders-empty">
          <p>Non hai ancora importato nessuna gara.</p>
          <Link to="/imports/telemat">Carica un report Telemat</Link>
        </section>
      )}

      {data && data.length > 0 && (
        <section className="imported-tenders-table-card">
          <table className="imported-tenders-table">
            <thead>
              <tr>
                <th>CIG</th>
                <th>Oggetto</th>
                <th>Priorità</th>
                <th>Fonte</th>
                <th>Importo</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th>Importato il</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((tender) => (
                <tr key={tender.id}>
                  <td>
                    <Link to={`/tenders/${tender.id}`} className="imported-tenders-link">
                      {tender.cig}
                    </Link>
                  </td>
                  <td className="imported-tenders-oggetto">
                    {tender.oggetto || "—"}
                  </td>
                  <td>
                    <PriorityBadge priorita={tender.priorita} />
                  </td>
                  <td>
                    <span className={`imported-tenders-source imported-tenders-source--${tender.source}`}>
                      {TENDER_SOURCE_LABELS[tender.source]}
                    </span>
                  </td>
                  <td>{formatImporto(tender.importo)}</td>
                  <td>{formatScadenza(tender.scadenza)}</td>
                  <td>
                    <span className={`imported-tenders-badge imported-tenders-badge--${tender.stato}`}>
                      {TENDER_STATO_LABELS[tender.stato]}
                    </span>
                  </td>
                  <td>
                    {tender.imported_at ? formatDateTime(tender.imported_at) : "—"}
                    {tender.import_filename && (
                      <span className="imported-tenders-filename">{tender.import_filename}</span>
                    )}
                  </td>
                  <td>
                    <Link to={`/tenders/${tender.id}`} className="imported-tenders-detail-link">
                      Dettaglio
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
