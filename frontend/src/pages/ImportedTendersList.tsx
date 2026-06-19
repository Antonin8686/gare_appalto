import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchImportedTenders } from "../api/tenders";
import { PriorityBadge } from "../components/PriorityBadge";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import {
  TENDER_SOURCE_LABELS,
  TENDER_STATO_LABELS,
  type Tender,
  type TenderPriorita,
  type TenderSource,
  type TenderStato,
} from "../types/tender";
import { compareNumbers, compareOptionalStrings, compareStrings, sortRows } from "../utils/tableSort";
import "./ImportedTendersList.css";

type SortColumn =
  | "cig"
  | "oggetto"
  | "priorita"
  | "source"
  | "importo"
  | "scadenza"
  | "stato"
  | "imported_at";

const PRIORITA_ORDER: Record<TenderPriorita, number> = { alta: 0, media: 1, bassa: 2 };
const STATO_ORDER: Record<TenderStato, number> = {
  bozza: 0,
  aperta: 1,
  chiusa: 2,
  aggiudicata: 3,
};

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "cig", label: "CIG" },
  { id: "oggetto", label: "Oggetto" },
  { id: "priorita", label: "Priorità" },
  { id: "source", label: "Fonte" },
  { id: "importo", label: "Importo" },
  { id: "scadenza", label: "Scadenza" },
  { id: "stato", label: "Stato" },
  { id: "imported_at", label: "Importato il" },
];

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

function compareImportedTenders(a: Tender, b: Tender, column: SortColumn): number {
  switch (column) {
    case "cig":
      return compareStrings(a.cig, b.cig);
    case "oggetto":
      return compareStrings(a.oggetto, b.oggetto);
    case "priorita":
      return (PRIORITA_ORDER[a.priorita] ?? 99) - (PRIORITA_ORDER[b.priorita] ?? 99);
    case "source":
      return compareStrings(a.source, b.source);
    case "importo":
      return compareNumbers(Number(a.importo), Number(b.importo));
    case "scadenza":
      return compareStrings(a.scadenza, b.scadenza);
    case "stato":
      return (STATO_ORDER[a.stato] ?? 0) - (STATO_ORDER[b.stato] ?? 0);
    case "imported_at":
      return compareOptionalStrings(a.imported_at, b.imported_at);
  }
}

export function ImportedTendersListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["imported-tenders"],
    queryFn: fetchImportedTenders,
  });

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>(
    "scadenza",
    "asc",
    ["priorita", "importo", "imported_at"],
  );

  const sortedTenders = useMemo(() => {
    if (!data) return [];
    return sortRows(data, sortColumn, sortDirection, compareImportedTenders, (a, b) =>
      compareStrings(a.cig, b.cig),
    );
  }, [data, sortColumn, sortDirection]);

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

      {sortedTenders.length > 0 && (
        <section className="imported-tenders-table-card">
          <table className="imported-tenders-table">
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
                <th aria-sort="none" />
              </tr>
            </thead>
            <tbody>
              {sortedTenders.map((tender) => (
                <tr key={tender.id}>
                  <td>
                    <Link to={`/tenders/${tender.id}`} className="imported-tenders-link">
                      {tender.cig}
                    </Link>
                  </td>
                  <td className="imported-tenders-oggetto">{tender.oggetto || "—"}</td>
                  <td>
                    <PriorityBadge priorita={tender.priorita} />
                  </td>
                  <td>
                    <span className={`imported-tenders-source imported-tenders-source--${tender.source}`}>
                      {TENDER_SOURCE_LABELS[tender.source as TenderSource]}
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
