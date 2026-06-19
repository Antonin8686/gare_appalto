import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchScoutingImports, uploadScoutingFile } from "../api/imports";
import { fetchScoutingTenders, rescoreScoutingTenders } from "../api/tenders";
import { PriorityBadge } from "../components/PriorityBadge";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import {
  TENDER_PRIORITA_OPTIONS,
  TENDER_STATO_LABELS,
  type Tender,
  type TenderPriorita,
  type TenderStato,
} from "../types/tender";
import { compareNumbers, compareStrings, sortRows } from "../utils/tableSort";
import "./ScoutingDashboard.css";

type SortColumn = "priorita" | "cig" | "oggetto" | "importo" | "scadenza" | "stato";

const PRIORITA_ORDER: Record<TenderPriorita, number> = { alta: 0, media: 1, bassa: 2 };
const STATO_ORDER: Record<TenderStato, number> = {
  bozza: 0,
  aperta: 1,
  chiusa: 2,
  aggiudicata: 3,
};

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "priorita", label: "Priorità" },
  { id: "cig", label: "CIG" },
  { id: "oggetto", label: "Oggetto" },
  { id: "importo", label: "Importo" },
  { id: "scadenza", label: "Scadenza" },
  { id: "stato", label: "Stato" },
];

function compareScoutingTenders(a: Tender, b: Tender, column: SortColumn): number {
  switch (column) {
    case "priorita":
      return (
        (PRIORITA_ORDER[a.priorita] ?? 99) - (PRIORITA_ORDER[b.priorita] ?? 99) ||
        b.priority_score - a.priority_score
      );
    case "cig":
      return compareStrings(a.cig, b.cig);
    case "oggetto":
      return compareStrings(a.oggetto, b.oggetto);
    case "importo":
      return compareNumbers(Number(a.importo), Number(b.importo));
    case "scadenza":
      return compareStrings(a.scadenza, b.scadenza);
    case "stato":
      return (STATO_ORDER[a.stato] ?? 0) - (STATO_ORDER[b.stato] ?? 0);
  }
}

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

export function ScoutingDashboardPage() {
  const queryClient = useQueryClient();
  const [prioritaFilter, setPrioritaFilter] = useState<TenderPriorita | "all">("all");

  const tendersQuery = useQuery({
    queryKey: ["scouting-tenders", prioritaFilter],
    queryFn: () =>
      fetchScoutingTenders(
        prioritaFilter === "all" ? {} : { priorita: prioritaFilter },
      ),
  });

  const allTendersQuery = useQuery({
    queryKey: ["scouting-tenders", "all"],
    queryFn: () => fetchScoutingTenders(),
  });

  const importsQuery = useQuery({
    queryKey: ["scouting-imports"],
    queryFn: fetchScoutingImports,
  });

  const rescoreMutation = useMutation({
    mutationFn: rescoreScoutingTenders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouting-tenders"] });
      queryClient.invalidateQueries({ queryKey: ["scouting-imports"] });
      queryClient.invalidateQueries({ queryKey: ["imported-tenders"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadScoutingFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouting-imports"] });
      queryClient.invalidateQueries({ queryKey: ["scouting-tenders"] });
      queryClient.invalidateQueries({ queryKey: ["imported-tenders"] });
    },
  });

  const tenders = tendersQuery.data ?? [];

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>(
    "priorita",
    "asc",
    ["priorita", "importo"],
  );

  const sortedTenders = useMemo(
    () =>
      sortRows(tenders, sortColumn, sortDirection, compareScoutingTenders, (a, b) =>
        compareStrings(a.cig, b.cig),
      ),
    [tenders, sortColumn, sortDirection],
  );

  const displayCounts = useMemo(() => {
    const source = allTendersQuery.data ?? [];
    return {
      alta: source.filter((t) => t.priorita === "alta").length,
      media: source.filter((t) => t.priorita === "media").length,
      bassa: source.filter((t) => t.priorita === "bassa").length,
      total: source.length,
    };
  }, [allTendersQuery.data]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      event.target.value = "";
    }
  }

  return (
    <div className="scouting-dashboard">
      <header className="scouting-dashboard-header">
        <div>
          <h2>Dashboard Scouting</h2>
          <p>Gare da scouting ordinate per priorità: importo, scadenza, stato e compatibilità.</p>
        </div>
        <div className="scouting-dashboard-actions">
          <label className="scouting-dashboard-upload">
            {uploadMutation.isPending ? "Caricamento..." : "Importa file"}
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
              hidden
            />
          </label>
          <button
            type="button"
            className="scouting-dashboard-btn scouting-dashboard-btn--secondary"
            onClick={() => rescoreMutation.mutate()}
            disabled={rescoreMutation.isPending}
          >
            {rescoreMutation.isPending ? "Ricalcolo..." : "Ricalcola priorità"}
          </button>
        </div>
      </header>

      {uploadMutation.isError && (
        <p className="scouting-dashboard-error">
          Errore import:{" "}
          {uploadMutation.error instanceof Error
            ? uploadMutation.error.message
            : "caricamento fallito"}
        </p>
      )}

      <section className="scouting-dashboard-stats">
        <article className="scouting-dashboard-stat scouting-dashboard-stat--alta">
          <span className="scouting-dashboard-stat-label">Alta priorità</span>
          <strong>{displayCounts.alta}</strong>
        </article>
        <article className="scouting-dashboard-stat scouting-dashboard-stat--media">
          <span className="scouting-dashboard-stat-label">Media priorità</span>
          <strong>{displayCounts.media}</strong>
        </article>
        <article className="scouting-dashboard-stat scouting-dashboard-stat--bassa">
          <span className="scouting-dashboard-stat-label">Bassa priorità</span>
          <strong>{displayCounts.bassa}</strong>
        </article>
        <article className="scouting-dashboard-stat">
          <span className="scouting-dashboard-stat-label">Totale scouting</span>
          <strong>{displayCounts.total}</strong>
        </article>
      </section>

      <section className="scouting-dashboard-filters">
        <span className="scouting-dashboard-filters-label">Filtra per priorità:</span>
        <div className="scouting-dashboard-filters-group">
          {TENDER_PRIORITA_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`scouting-dashboard-filter ${
                prioritaFilter === option.value ? "scouting-dashboard-filter--active" : ""
              } ${option.value !== "all" ? `scouting-dashboard-filter--${option.value}` : ""}`}
              onClick={() => setPrioritaFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {importsQuery.data && importsQuery.data.length > 0 && (
        <section className="scouting-dashboard-imports">
          <h3>Ultimi import</h3>
          <ul>
            {importsQuery.data.slice(0, 3).map((batch) => (
              <li key={batch.id}>
                {batch.original_filename} — {batch.tenders_created} gare —{" "}
                <span className={`scouting-dashboard-import-status scouting-dashboard-import-status--${batch.status}`}>
                  {batch.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tendersQuery.isLoading && (
        <p className="scouting-dashboard-loading">Caricamento gare scouting...</p>
      )}

      {tendersQuery.isError && (
        <p className="scouting-dashboard-error">
          Errore:{" "}
          {tendersQuery.error instanceof Error
            ? tendersQuery.error.message
            : "impossibile caricare le gare"}
        </p>
      )}

      {tendersQuery.data && tenders.length === 0 && (
        <section className="scouting-dashboard-empty">
          <p>
            {prioritaFilter === "all"
              ? "Nessuna gara da scouting. Importa un file per iniziare."
              : `Nessuna gara con priorità ${prioritaFilter}.`}
          </p>
        </section>
      )}

      {sortedTenders.length > 0 && (
        <section className="scouting-dashboard-table-card">
          <table className="scouting-dashboard-table">
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
                    <PriorityBadge
                      priorita={tender.priorita}
                      score={tender.priority_score}
                      showScore
                    />
                  </td>
                  <td>
                    <Link to={`/tenders/${tender.id}`} className="scouting-dashboard-link">
                      {tender.cig}
                    </Link>
                  </td>
                  <td className="scouting-dashboard-oggetto">
                    {tender.oggetto || "—"}
                  </td>
                  <td>{formatImporto(tender.importo)}</td>
                  <td>{formatScadenza(tender.scadenza)}</td>
                  <td>
                    <span className={`scouting-dashboard-badge scouting-dashboard-badge--${tender.stato}`}>
                      {TENDER_STATO_LABELS[tender.stato]}
                    </span>
                  </td>
                  <td>
                    <Link to={`/tenders/${tender.id}`} className="scouting-dashboard-detail-link">
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
