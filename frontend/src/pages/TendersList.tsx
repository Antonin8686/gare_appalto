import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteTender, fetchTenders } from "../api/tenders";
import { SortableTableHeader } from "../components/SortableTableHeader";
import type { Tender, TenderFase, TenderStato } from "../types/tender";
import { TENDER_FASE_LABELS, TENDER_FASI, TENDER_STATI, TENDER_STATO_LABELS } from "../types/tender";
import "./TendersList.css";

type SortColumn = "cig" | "cpv" | "importo" | "scadenza" | "fase" | "stato";
type SortDirection = "asc" | "desc";

const FASE_ORDER = Object.fromEntries(TENDER_FASI.map((item, index) => [item.value, index])) as Record<
  TenderFase,
  number
>;
const STATO_ORDER = Object.fromEntries(TENDER_STATI.map((item, index) => [item.value, index])) as Record<
  TenderStato,
  number
>;

const SORTABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "cig", label: "CIG" },
  { id: "cpv", label: "CPV" },
  { id: "importo", label: "Importo" },
  { id: "scadenza", label: "Scadenza" },
  { id: "fase", label: "Fase" },
  { id: "stato", label: "Stato" },
];

function sortTenders(tenders: Tender[], column: SortColumn, direction: SortDirection): Tender[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...tenders].sort((a, b) => {
    let comparison = 0;

    switch (column) {
      case "cig":
        comparison = a.cig.localeCompare(b.cig, "it", { sensitivity: "base" });
        break;
      case "cpv":
        comparison = a.cpv.localeCompare(b.cpv, "it", { sensitivity: "base" });
        break;
      case "importo":
        comparison = Number(a.importo) - Number(b.importo);
        break;
      case "scadenza":
        comparison = a.scadenza.localeCompare(b.scadenza);
        break;
      case "fase":
        comparison = (FASE_ORDER[a.fase] ?? 0) - (FASE_ORDER[b.fase] ?? 0);
        break;
      case "stato":
        comparison = (STATO_ORDER[a.stato] ?? 0) - (STATO_ORDER[b.stato] ?? 0);
        break;
    }

    if (comparison === 0) {
      return a.cig.localeCompare(b.cig, "it", { sensitivity: "base" }) * factor;
    }

    return comparison * factor;
  });
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

interface TenderRowActionsProps {
  tender: Tender;
  confirmDeleteId: number | null;
  deletingId: number | null;
  onConfirmRequest: (id: number) => void;
  onConfirmCancel: () => void;
  onConfirmDelete: (id: number) => void;
  variant?: "inline" | "card";
}

function TenderRowActions({
  tender,
  confirmDeleteId,
  deletingId,
  onConfirmRequest,
  onConfirmCancel,
  onConfirmDelete,
  variant = "inline",
}: TenderRowActionsProps) {
  const isConfirming = confirmDeleteId === tender.id;
  const isDeleting = deletingId === tender.id;

  if (isConfirming) {
    return (
      <div
        className={`tenders-delete-confirm${variant === "card" ? " tenders-delete-confirm--card" : ""}`}
      >
        <span className="tenders-delete-confirm-label">Eliminare?</span>
        <div className="tenders-delete-confirm-buttons">
          <button
            type="button"
            className="tenders-delete-confirm-btn"
            onClick={() => onConfirmDelete(tender.id)}
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminazione..." : variant === "card" ? "Conferma" : "Conferma eliminazione"}
          </button>
          <button
            type="button"
            className="tenders-delete-cancel-btn"
            onClick={onConfirmCancel}
            disabled={isDeleting}
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="tenders-card-actions">
        <Link to={`/tenders/${tender.id}/edit`} className="tenders-edit-link">
          Modifica
        </Link>
        <button
          type="button"
          className="tenders-delete-btn"
          onClick={() => onConfirmRequest(tender.id)}
          disabled={deletingId !== null}
        >
          Elimina
        </button>
      </div>
    );
  }

  return (
    <div className="tenders-row-actions">
      <Link to={`/tenders/${tender.id}/edit`} className="tenders-edit-link">
        Modifica
      </Link>
      <button
        type="button"
        className="tenders-delete-btn"
        onClick={() => onConfirmRequest(tender.id)}
        disabled={deletingId !== null}
      >
        Elimina
      </button>
    </div>
  );
}

interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}

function SortableHeader(props: SortableHeaderProps) {
  return <SortableTableHeader {...props} />;
}

export function TendersListPage() {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>("scadenza");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tenders"],
    queryFn: fetchTenders,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTender(id),
    onMutate: (id) => {
      setDeletingId(id);
      setDeleteError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setConfirmDeleteId(null);
    },
    onError: () => {
      setDeleteError("Eliminazione non riuscita. Riprova.");
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const actionProps = {
    confirmDeleteId,
    deletingId,
    onConfirmRequest: setConfirmDeleteId,
    onConfirmCancel: () => setConfirmDeleteId(null),
    onConfirmDelete: (id: number) => deleteMutation.mutate(id),
  };

  const sortedTenders = useMemo(() => {
    if (!data) return [];
    if (!sortColumn) return data;
    return sortTenders(data, sortColumn, sortDirection);
  }, [data, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "scadenza" || column === "importo" ? "desc" : "asc");
  }

  return (
    <div className="tenders">
      <header className="tenders-header">
        <div>
          <h2>Le tue gare</h2>
          <p>Gestisci le gare d'appalto associate al tuo account.</p>
        </div>
        <div className="tenders-header__actions">
          <Link to="/tenders/board" className="tenders-board-link">
            Board
          </Link>
          <Link to="/tenders/new" className="tenders-new-btn">
            Nuova gara
          </Link>
        </div>
      </header>

      {isLoading && <p className="tenders-loading">Caricamento...</p>}

      {isError && (
        <p className="tenders-error">
          Errore: {error instanceof Error ? error.message : "impossibile caricare le gare"}
        </p>
      )}

      {deleteError && <p className="tenders-error">{deleteError}</p>}

      {data && data.length === 0 && (
        <section className="tenders-empty">
          <p>Non hai ancora registrato nessuna gara.</p>
          <Link to="/tenders/new">Crea la prima gara</Link>
        </section>
      )}

      {data && data.length > 0 && (
        <>
          <div className="tenders-sort-mobile tenders-mobile-only">
            <label htmlFor="tenders-sort-select">Ordina per</label>
            <select
              id="tenders-sort-select"
              value={sortColumn ? `${sortColumn}:${sortDirection}` : ""}
              onChange={(event) => {
                const [column, direction] = event.target.value.split(":") as [SortColumn, SortDirection];
                setSortColumn(column);
                setSortDirection(direction);
              }}
            >
              {SORTABLE_COLUMNS.flatMap(({ id, label }) => [
                <option key={`${id}-asc`} value={`${id}:asc`}>
                  {label} (crescente)
                </option>,
                <option key={`${id}-desc`} value={`${id}:desc`}>
                  {label} (decrescente)
                </option>,
              ])}
            </select>
          </div>

          <section className="tenders-table-card tenders-desktop-only" aria-label="Elenco gare">
            <table className="tenders-table">
              <thead>
                <tr>
                  {SORTABLE_COLUMNS.map(({ id, label }) => (
                    <SortableHeader
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
                      <Link to={`/tenders/${tender.id}`} className="tenders-link">
                        {tender.cig}
                      </Link>
                    </td>
                    <td>{tender.cpv}</td>
                    <td>{formatImporto(tender.importo)}</td>
                    <td>{formatScadenza(tender.scadenza)}</td>
                    <td>
                      <span className={`tenders-badge tenders-badge--fase-${tender.fase}`}>
                        {TENDER_FASE_LABELS[tender.fase]}
                      </span>
                    </td>
                    <td>
                      <span className={`tenders-badge tenders-badge--${tender.stato}`}>
                        {TENDER_STATO_LABELS[tender.stato]}
                      </span>
                    </td>
                    <td>
                      <TenderRowActions tender={tender} {...actionProps} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="tenders-cards tenders-mobile-only" aria-label="Elenco gare">
            {sortedTenders.map((tender) => (
              <article
                key={tender.id}
                className={`tenders-card${confirmDeleteId === tender.id ? " tenders-card--confirm" : ""}`}
              >
                <div className="tenders-card-main">
                  <div className="tenders-card-top">
                    <Link to={`/tenders/${tender.id}`} className="tenders-card-cig">
                      {tender.cig}
                    </Link>
                    <div className="tenders-card-badges">
                      <span className={`tenders-badge tenders-badge--fase-${tender.fase}`}>
                        {TENDER_FASE_LABELS[tender.fase]}
                      </span>
                      <span className={`tenders-badge tenders-badge--${tender.stato}`}>
                        {TENDER_STATO_LABELS[tender.stato]}
                      </span>
                    </div>
                  </div>
                  <p className="tenders-card-summary">
                    {tender.cpv} · {formatImporto(tender.importo)} · {formatScadenza(tender.scadenza)}
                  </p>
                </div>

                <TenderRowActions tender={tender} {...actionProps} variant="card" />
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
