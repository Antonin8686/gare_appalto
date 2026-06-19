import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAnalysisHub } from "../api/analysisHub";
import { deleteTender } from "../api/tenders";
import { PriorityBadge } from "../components/PriorityBadge";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { useAuth } from "../contexts/AuthContext";
import {
  ANALYSIS_STATUS_LABELS,
  ANALYSIS_STATUS_OPTIONS,
  type AnalysisHubItem,
  type AnalysisStatus,
} from "../types/analysisHub";
import { TENDER_FASI, TENDER_SOURCE_LABELS, type TenderFase, type TenderPriorita, type TenderSource } from "../types/tender";
import "./TenderAnalysisHub.css";

type SortColumn =
  | "cig"
  | "oggetto"
  | "source"
  | "priorita"
  | "analysis_status"
  | "requirements"
  | "criteria"
  | "scadenza";
type SortDirection = "asc" | "desc";
type ScadenzaFilter = "all" | "7d" | "30d" | "scadute";
type DocumentiFilter = "all" | "con" | "senza";
type SchedaFilter = "all" | "pronta" | "no";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "cig", label: "CIG" },
  { id: "oggetto", label: "Oggetto" },
  { id: "source", label: "Fonte" },
  { id: "priorita", label: "Priorità" },
  { id: "analysis_status", label: "Stato analisi" },
  { id: "requirements", label: "Requisiti" },
  { id: "criteria", label: "Criteri" },
  { id: "scadenza", label: "Scadenza" },
];

const PRIORITA_ORDER: Record<TenderPriorita, number> = {
  alta: 0,
  media: 1,
  bassa: 2,
};

const ANALYSIS_STATUS_ORDER = Object.fromEntries(
  ANALYSIS_STATUS_OPTIONS.filter((opt) => opt.value !== "all").map((opt, index) => [opt.value, index]),
) as Record<AnalysisStatus, number>;

function collectRegionOptions(items: AnalysisHubItem[], facets?: { regioni?: string[] }): string[] {
  const fromFacets = facets?.regioni ?? [];
  const fromItems = items.map((item) => item.regione).filter((regione): regione is string => Boolean(regione));
  return [...new Set([...fromFacets, ...fromItems])].sort((a, b) => a.localeCompare(b, "it"));
}

function matchesScadenzaFilter(scadenza: string, filter: ScadenzaFilter): boolean {
  if (filter === "all") return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(scadenza);
  date.setHours(0, 0, 0, 0);

  if (filter === "scadute") return date < today;

  const days = filter === "7d" ? 7 : 30;
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return date >= today && date <= limit;
}

function sortAnalysisItems(
  items: AnalysisHubItem[],
  column: SortColumn,
  direction: SortDirection,
): AnalysisHubItem[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (column) {
      case "cig":
        comparison = a.cig.localeCompare(b.cig, "it", { sensitivity: "base" });
        break;
      case "oggetto":
        comparison = a.oggetto.localeCompare(b.oggetto, "it", { sensitivity: "base" });
        break;
      case "source":
        comparison = a.source.localeCompare(b.source, "it", { sensitivity: "base" });
        break;
      case "priorita":
        comparison =
          (PRIORITA_ORDER[a.priorita as TenderPriorita] ?? 99) -
          (PRIORITA_ORDER[b.priorita as TenderPriorita] ?? 99);
        if (comparison === 0) {
          comparison = b.priority_score - a.priority_score;
        }
        break;
      case "analysis_status":
        comparison =
          (ANALYSIS_STATUS_ORDER[a.analysis_status] ?? 99) -
          (ANALYSIS_STATUS_ORDER[b.analysis_status] ?? 99);
        break;
      case "requirements":
        comparison = a.requirements.total - b.requirements.total;
        break;
      case "criteria":
        comparison = a.criteria_count - b.criteria_count;
        break;
      case "scadenza":
        comparison = a.scadenza.localeCompare(b.scadenza);
        break;
    }

    if (comparison === 0) {
      return a.cig.localeCompare(b.cig, "it", { sensitivity: "base" }) * factor;
    }

    return comparison * factor;
  });
}

function formatScadenza(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  return (
    <span className={`tah-status tah-status--${status}`}>
      {ANALYSIS_STATUS_LABELS[status]}
    </span>
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

function InitActions() {
  return (
    <div className="tah-actions">
      <Link to="/imports/telemat" className="tah-btn tah-btn--secondary">
        Telemat
      </Link>
      <Link to="/imports/welfare" className="tah-btn tah-btn--secondary">
        Welfare
      </Link>
      <Link to="/scouting" className="tah-btn tah-btn--secondary">
        Scouting
      </Link>
    </div>
  );
}

function AnalysisHubCard({
  item,
  selectable,
  selected,
  onToggleSelect,
}: {
  item: AnalysisHubItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  return (
    <article className={`tah-card${selected ? " tah-card--selected" : ""}`}>
      <div className="tah-card__main">
        <div className="tah-card__top">
          <Link to={`/tenders/${item.id}`} className="tah-card__cig">
            {item.cig}
          </Link>
          <PriorityBadge priorita={item.priorita as TenderPriorita} />
        </div>
        <p className="tah-card__oggetto">{item.oggetto || "Nessun oggetto"}</p>
        <div className="tah-card__badges">
          <AnalysisStatusBadge status={item.analysis_status} />
          <span className={`tah-source tah-source--${item.source}`}>
            {TENDER_SOURCE_LABELS[item.source as TenderSource] ?? item.source}
          </span>
        </div>
        <dl className="tah-card__stats">
          <div>
            <dt>Scadenza</dt>
            <dd>{formatScadenza(item.scadenza)}</dd>
          </div>
          <div>
            <dt>Requisiti</dt>
            <dd>{item.requirements.total || "—"}</dd>
          </div>
          <div>
            <dt>Criteri</dt>
            <dd>{item.criteria_count || "—"}</dd>
          </div>
          {item.regione && (
            <div>
              <dt>Regione</dt>
              <dd>{item.regione}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="tah-card__actions">
        <Link to={`/tenders/${item.id}`} className="tah-card__action">
          Scheda
        </Link>
        {selectable && onToggleSelect && (
          <label className="tah-card__select">
            <input
              type="checkbox"
              className="tah-checkbox"
              checked={selected}
              onChange={() => onToggleSelect(item.id)}
              aria-label={`Seleziona gara ${item.cig}`}
            />
          </label>
        )}
      </div>
    </article>
  );
}

interface SelectionBarProps {
  selectedCount: number;
  confirmDelete: boolean;
  isDeleting: boolean;
  onClear: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  className?: string;
}

function SelectionBar({
  selectedCount,
  confirmDelete,
  isDeleting,
  onClear,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  className,
}: SelectionBarProps) {
  return (
    <section
      className={`tah-selection-bar${className ? ` ${className}` : ""}`}
      aria-live="polite"
    >
      <div className="tah-selection-bar__info">
        <span className="tah-selection-bar__count">
          {selectedCount === 1 ? "1 gara selezionata" : `${selectedCount} gare selezionate`}
        </span>
        <button
          type="button"
          className="tah-selection-bar__clear"
          onClick={onClear}
          disabled={isDeleting}
        >
          Deseleziona
        </button>
      </div>

      {!confirmDelete ? (
        <button
          type="button"
          className="tah-btn tah-btn--danger"
          onClick={onRequestDelete}
          disabled={isDeleting}
        >
          Elimina selezionate
        </button>
      ) : (
        <div className="tah-selection-bar__confirm">
          <span className="tah-selection-bar__confirm-label">
            {selectedCount === 1
              ? "Eliminare la gara selezionata?"
              : `Eliminare ${selectedCount} gare selezionate?`}
          </span>
          <div className="tah-selection-bar__confirm-actions">
            <button
              type="button"
              className="tah-btn tah-btn--danger-solid"
              onClick={onConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminazione..." : "Conferma"}
            </button>
            <button
              type="button"
              className="tah-btn tah-btn--ghost"
              onClick={onCancelDelete}
              disabled={isDeleting}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function countActiveFilters(filters: {
  regione: string;
  source: string;
  priorita: string;
  fase: string;
  status: string;
  scadenza: string;
  documenti: string;
  scheda: string;
}): number {
  let count = 0;
  if (filters.regione !== "all") count += 1;
  if (filters.source !== "all") count += 1;
  if (filters.priorita !== "all") count += 1;
  if (filters.fase !== "all") count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.scadenza !== "all") count += 1;
  if (filters.documenti !== "all") count += 1;
  if (filters.scheda !== "all") count += 1;
  return count;
}

export function TenderAnalysisHubPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canDelete = can("tenders.delete");

  const [sourceFilter, setSourceFilter] = useState<TenderSource | "all">("all");
  const [prioritaFilter, setPrioritaFilter] = useState<TenderPriorita | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | "all">("all");
  const [regioneFilter, setRegioneFilter] = useState<string>("all");
  const [faseFilter, setFaseFilter] = useState<TenderFase | "all">("all");
  const [scadenzaFilter, setScadenzaFilter] = useState<ScadenzaFilter>("all");
  const [documentiFilter, setDocumentiFilter] = useState<DocumentiFilter>("all");
  const [schedaFilter, setSchedaFilter] = useState<SchedaFilter>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>("priorita");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params: { source?: TenderSource; priorita?: TenderPriorita } = {};
    if (sourceFilter !== "all") params.source = sourceFilter;
    if (prioritaFilter !== "all") params.priorita = prioritaFilter;
    return params;
  }, [sourceFilter, prioritaFilter]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analysis-hub", "v2", queryParams],
    queryFn: () => fetchAnalysisHub(queryParams),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const needsRefresh = items.some(
        (item) =>
          item.analysis_status === "documenti_in_elaborazione" || item.documents.processing > 0,
      );
      return needsRefresh ? 5000 : false;
    },
  });

  const regionOptions = useMemo(() => {
    if (!data) return [];
    return collectRegionOptions(data.items, data.facets);
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (statusFilter !== "all" && item.analysis_status !== statusFilter) return false;
      if (regioneFilter !== "all" && item.regione !== regioneFilter) return false;
      if (faseFilter !== "all" && item.fase !== faseFilter) return false;
      if (!matchesScadenzaFilter(item.scadenza, scadenzaFilter)) return false;
      if (documentiFilter === "con" && item.documents.total === 0) return false;
      if (documentiFilter === "senza" && item.documents.total > 0) return false;
      if (schedaFilter === "pronta" && !item.scheda_ready) return false;
      if (schedaFilter === "no" && item.scheda_ready) return false;
      return true;
    });
  }, [data, statusFilter, regioneFilter, faseFilter, scadenzaFilter, documentiFilter, schedaFilter]);

  const sortedItems = useMemo(() => {
    if (!sortColumn) return filteredItems;
    return sortAnalysisItems(filteredItems, sortColumn, sortDirection);
  }, [filteredItems, sortColumn, sortDirection]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => deleteTender(id)));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) {
        throw new Error(
          failed === ids.length
            ? "Eliminazione non riuscita. Riprova."
            : `${failed} di ${ids.length} gare non eliminate.`,
        );
      }
    },
    onMutate: () => {
      setDeleteError(null);
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["analysis-hub"] });
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setSelectedIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setConfirmDelete(false);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : "Eliminazione non riuscita.");
      queryClient.invalidateQueries({ queryKey: ["analysis-hub"] });
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    },
  });

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    sortedItems.length > 0 && sortedItems.every((item) => selectedIds.has(item.id));
  const someVisibleSelected = sortedItems.some((item) => selectedIds.has(item.id));

  function toggleSelect(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setConfirmDelete(false);
    setDeleteError(null);
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        sortedItems.forEach((item) => next.delete(item.id));
      } else {
        sortedItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
    setConfirmDelete(false);
    setDeleteError(null);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setConfirmDelete(false);
    setDeleteError(null);
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    deleteMutation.mutate(ids);
  }

  const activeFilterCount = countActiveFilters({
    regione: regioneFilter,
    source: sourceFilter,
    priorita: prioritaFilter,
    fase: faseFilter,
    status: statusFilter,
    scadenza: scadenzaFilter,
    documenti: documentiFilter,
    scheda: schedaFilter,
  });

  function resetFilters() {
    setRegioneFilter("all");
    setSourceFilter("all");
    setPrioritaFilter("all");
    setFaseFilter("all");
    setStatusFilter("all");
    setScadenzaFilter("all");
    setDocumentiFilter("all");
    setSchedaFilter("all");
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    const descByDefault: SortColumn[] = ["priorita", "requirements", "criteria", "scadenza"];
    setSortDirection(descByDefault.includes(column) ? "desc" : "asc");
  }

  return (
    <div
      className={`tah${canDelete && selectedCount > 0 ? " tah--selection-active" : ""}${confirmDelete && selectedCount > 0 ? " tah--confirm-delete" : ""}`}
    >
      <header className="tah-header">
        <div>
          <h2>Centro Analisi Gare</h2>
          <p>
            Motore di raccolta, classificazione e studio automatico delle gare importate.
            Confronto con le aziende disponibile in fase successiva.
          </p>
        </div>
        <InitActions />
      </header>

      {data && (
        <section className="tah-kpis">
          <div className="tah-kpi">
            <span className="tah-kpi__value">{data.summary.total}</span>
            <span className="tah-kpi__label">Gare importate</span>
          </div>
          <div className="tah-kpi tah-kpi--success">
            <span className="tah-kpi__value">{data.summary.completate}</span>
            <span className="tah-kpi__label">Analisi completate</span>
          </div>
          <div className="tah-kpi tah-kpi--warning">
            <span className="tah-kpi__value">
              {data.summary.in_attesa + data.summary.documenti_in_elaborazione}
            </span>
            <span className="tah-kpi__label">In attesa / elaborazione</span>
          </div>
          <div className="tah-kpi">
            <span className="tah-kpi__value">{data.summary.con_requisiti}</span>
            <span className="tah-kpi__label">Con requisiti estratti</span>
          </div>
        </section>
      )}

      <section className="tah-filters">
        <div className="tah-filters__toolbar tah-mobile-only">
          <button
            type="button"
            className={`tah-filters-toggle${filtersOpen ? " tah-filters-toggle--open" : ""}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filtri e ordine
            {activeFilterCount > 0 && (
              <span className="tah-filters-badge">{activeFilterCount}</span>
            )}
          </button>
          {data && (
            <span className="tah-results-count">
              {sortedItems.length} di {data.summary.total} gare
            </span>
          )}
        </div>

        <div className={`tah-filters__grid${filtersOpen ? " tah-filters__grid--open" : ""}`}>
        <label>
          Regione
          <select value={regioneFilter} onChange={(e) => setRegioneFilter(e.target.value)}>
            <option value="all">Tutte</option>
            {regionOptions.map((regione) => (
              <option key={regione} value={regione}>
                {regione}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fonte
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as TenderSource | "all")}
          >
            <option value="all">Tutte</option>
            <option value="telemat">Telemat</option>
            <option value="scouting">Scouting</option>
            <option value="welfare">Welfare</option>
          </select>
        </label>
        <label>
          Priorità
          <select
            value={prioritaFilter}
            onChange={(e) => setPrioritaFilter(e.target.value as TenderPriorita | "all")}
          >
            <option value="all">Tutte</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="bassa">Bassa</option>
          </select>
        </label>
        <label>
          Fase
          <select
            value={faseFilter}
            onChange={(e) => setFaseFilter(e.target.value as TenderFase | "all")}
          >
            <option value="all">Tutte</option>
            {TENDER_FASI.map((fase) => (
              <option key={fase.value} value={fase.value}>
                {fase.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stato analisi
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnalysisStatus | "all")}
          >
            {ANALYSIS_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scadenza
          <select
            value={scadenzaFilter}
            onChange={(e) => setScadenzaFilter(e.target.value as ScadenzaFilter)}
          >
            <option value="all">Tutte</option>
            <option value="7d">Prossimi 7 giorni</option>
            <option value="30d">Prossimi 30 giorni</option>
            <option value="scadute">Scadute</option>
          </select>
        </label>
        <label>
          Documenti
          <select
            value={documentiFilter}
            onChange={(e) => setDocumentiFilter(e.target.value as DocumentiFilter)}
          >
            <option value="all">Tutti</option>
            <option value="con">Con documenti</option>
            <option value="senza">Senza documenti</option>
          </select>
        </label>
        <label>
          Scheda
          <select
            value={schedaFilter}
            onChange={(e) => setSchedaFilter(e.target.value as SchedaFilter)}
          >
            <option value="all">Tutte</option>
            <option value="pronta">Scheda pronta</option>
            <option value="no">Scheda da completare</option>
          </select>
        </label>
        <label className="tah-sort-mobile">
          Ordina
          <select
            value={sortColumn ? `${sortColumn}:${sortDirection}` : "priorita:asc"}
            onChange={(event) => {
              const [column, direction] = event.target.value.split(":") as [SortColumn, SortDirection];
              setSortColumn(column);
              setSortDirection(direction);
            }}
          >
            {TABLE_COLUMNS.flatMap(({ id, label }) => [
              <option key={`${id}-asc`} value={`${id}:asc`}>
                {label} (crescente)
              </option>,
              <option key={`${id}-desc`} value={`${id}:desc`}>
                {label} (decrescente)
              </option>,
            ])}
          </select>
        </label>

        {activeFilterCount > 0 && (
          <button type="button" className="tah-filters-reset" onClick={resetFilters}>
            Azzera filtri
          </button>
        )}
        </div>
      </section>

      {isLoading && <p className="tah-loading">Caricamento...</p>}
      {isError && (
        <p className="tah-error">
          Errore: {error instanceof Error ? error.message : "impossibile caricare i dati"}
        </p>
      )}

      {deleteError && <p className="tah-error">{deleteError}</p>}

      {data && filteredItems.length === 0 && (
        <section className="tah-empty">
          <p>Nessuna gara corrisponde ai filtri selezionati.</p>
          <Link to="/imports/telemat">Importa un report Telemat</Link>
        </section>
      )}

      {sortedItems.length > 0 && (
        <>
          {canDelete && selectedCount > 0 && (
            <SelectionBar
              className="tah-desktop-only"
              selectedCount={selectedCount}
              confirmDelete={confirmDelete}
              isDeleting={deleteMutation.isPending}
              onClear={clearSelection}
              onRequestDelete={() => setConfirmDelete(true)}
              onConfirmDelete={handleDeleteSelected}
              onCancelDelete={() => setConfirmDelete(false)}
            />
          )}

          <section className="tah-table-card tah-desktop-only" aria-label="Elenco gare analisi">
            <table className="tah-table">
              <thead>
                <tr>
                  {TABLE_COLUMNS.map(({ id, label }) => (
                    <SortableHeader
                      key={id}
                      column={id}
                      label={label}
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                  {canDelete && (
                    <th className="tah-actions-col" aria-sort="none">
                      <label className="tah-select-all tah-table-checkbox" title="Seleziona tutte">
                        <input
                          type="checkbox"
                          className="tah-checkbox"
                          checked={allVisibleSelected}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate = someVisibleSelected && !allVisibleSelected;
                            }
                          }}
                          onChange={toggleSelectAllVisible}
                          aria-label="Seleziona tutte le gare visibili"
                        />
                      </label>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className={selectedIds.has(item.id) ? "tah-row--selected" : undefined}>
                    <td>
                      <Link to={`/tenders/${item.id}`} className="tah-link">
                        {item.cig}
                      </Link>
                    </td>
                    <td className="tah-oggetto">{item.oggetto || "—"}</td>
                    <td>
                      <span className={`tah-source tah-source--${item.source}`}>
                        {TENDER_SOURCE_LABELS[item.source as TenderSource] ?? item.source}
                      </span>
                    </td>
                    <td>
                      <PriorityBadge priorita={item.priorita as TenderPriorita} />
                    </td>
                    <td>
                      <AnalysisStatusBadge status={item.analysis_status} />
                    </td>
                    <td>{item.requirements.total || "—"}</td>
                    <td>{item.criteria_count || "—"}</td>
                    <td>{formatScadenza(item.scadenza)}</td>
                    {canDelete && (
                      <td className="tah-actions-col">
                        <label className="tah-row-select tah-table-checkbox">
                          <input
                            type="checkbox"
                            className="tah-checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            aria-label={`Seleziona gara ${item.cig}`}
                          />
                        </label>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="tah-cards tah-mobile-only" aria-label="Elenco gare analisi">
            {canDelete && (
              <label className="tah-mobile-select-all">
                <input
                  type="checkbox"
                  className="tah-checkbox"
                  checked={allVisibleSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }
                  }}
                  onChange={toggleSelectAllVisible}
                />
                Seleziona tutte le gare visibili
              </label>
            )}
            {sortedItems.map((item) => (
              <AnalysisHubCard
                key={item.id}
                item={item}
                selectable={canDelete}
                selected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </section>

          {canDelete && selectedCount > 0 && (
            <SelectionBar
              className="tah-mobile-only tah-selection-bar--dock"
              selectedCount={selectedCount}
              confirmDelete={confirmDelete}
              isDeleting={deleteMutation.isPending}
              onClear={clearSelection}
              onRequestDelete={() => setConfirmDelete(true)}
              onConfirmDelete={handleDeleteSelected}
              onCancelDelete={() => setConfirmDelete(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
