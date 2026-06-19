import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchRequirementMatrix } from "../api/requirementMatrix";
import { useTableSort } from "../hooks/useTableSort";
import { compareStrings, sortRows } from "../utils/tableSort";
import "./SortableTable.css";
import {
  MATRIX_ESITO_LABELS,
  MATRIX_ESITO_OPTIONS,
  type MatrixEsito,
  type RequirementMatrixCell,
  type RequirementMatrixRow,
} from "../types/requirementMatrix";
import {
  REQUIREMENT_CATEGORIA_OPTIONS,
  REQUIREMENT_TIPO_LABELS,
  type RequirementCategoria,
  type RequirementTipo,
} from "../types/tenderRequirement";
import "./RequirementMatrixTable.css";

interface RequirementMatrixTableProps {
  tenderId: number;
}

type SortColumn = "requisito" | "categoria";

function compareMatrixRows(
  a: RequirementMatrixRow,
  b: RequirementMatrixRow,
  column: SortColumn,
): number {
  switch (column) {
    case "requisito":
      return compareStrings(a.descrizione, b.descrizione);
    case "categoria":
      return compareStrings(a.categoria_label, b.categoria_label);
  }
}

const TIPO_OPTIONS: { value: RequirementTipo | ""; label: string }[] = [
  { value: "", label: "Tutti i tipi" },
  ...(
    Object.entries(REQUIREMENT_TIPO_LABELS) as [RequirementTipo, string][]
  ).map(([value, label]) => ({ value, label })),
];

function cellClass(semaforo: RequirementMatrixCell["semaforo"]): string {
  return `matrix-cell matrix-cell--${semaforo}`;
}

function MatrixCellTooltip({ cell }: { cell: RequirementMatrixCell }) {
  return (
    <div className="matrix-cell-tooltip" role="tooltip">
      <p className="matrix-cell-tooltip__esito">{cell.esito_label}</p>
      <dl>
        <div>
          <dt>Posseduto</dt>
          <dd>{cell.valore_posseduto}</dd>
        </div>
        <div>
          <dt>Richiesto</dt>
          <dd>{cell.valore_richiesto}</dd>
        </div>
        <div>
          <dt>Motivazione</dt>
          <dd>{cell.motivazione}</dd>
        </div>
      </dl>
    </div>
  );
}

function MatrixRow({ row, companies }: { row: RequirementMatrixRow; companies: { id: number }[] }) {
  const cellByCompany = useMemo(() => {
    const map = new Map<number, RequirementMatrixCell>();
    for (const cell of row.cells) {
      map.set(cell.company_id, cell);
    }
    return map;
  }, [row.cells]);

  return (
    <tr>
      <th scope="row" className="matrix-row-header">
        <span className="matrix-row-categoria">{row.categoria_label}</span>
        <span className="matrix-row-desc">{row.descrizione}</span>
        {row.soglia_minima && (
          <span className="matrix-row-soglia">Soglia: {row.soglia_minima}</span>
        )}
      </th>
      {companies.map((company) => {
        const cell = cellByCompany.get(company.id);
        if (!cell) {
          return (
            <td key={company.id} className="matrix-cell matrix-cell--empty">
              —
            </td>
          );
        }
        return (
          <td key={company.id} className={cellClass(cell.semaforo)}>
            <button
              type="button"
              className="matrix-cell-btn"
              aria-label={`${cell.esito_label}: ${row.descrizione.slice(0, 60)}`}
            >
              <span className="matrix-cell-dot" aria-hidden />
              <span className="matrix-cell-label">{cell.esito_label}</span>
              <MatrixCellTooltip cell={cell} />
            </button>
          </td>
        );
      })}
    </tr>
  );
}

export function RequirementMatrixTable({ tenderId }: RequirementMatrixTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<RequirementCategoria | "">("");
  const [tipoFilter, setTipoFilter] = useState<RequirementTipo | "">("");
  const [esitoFilter, setEsitoFilter] = useState<MatrixEsito | "">("");
  const [companyFilter, setCompanyFilter] = useState<number | "">("");

  const filters = useMemo(
    () => ({
      q: searchQuery,
      categoria: categoriaFilter,
      tipo: tipoFilter,
      esito: esitoFilter,
      company: companyFilter,
    }),
    [searchQuery, categoriaFilter, tipoFilter, esitoFilter, companyFilter],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tenders", tenderId, "requirements-matrix", filters],
    queryFn: () => fetchRequirementMatrix(tenderId, filters),
    enabled: tenderId > 0,
  });

  const visibleCompanies = useMemo(() => {
    if (!data) return [];
    if (!companyFilter) return data.companies;
    return data.companies.filter((company) => company.id === companyFilter);
  }, [data, companyFilter]);

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>("requisito", "asc");

  const sortedRequirements = useMemo(() => {
    if (!data) return [];
    return sortRows(data.requirements, sortColumn, sortDirection, compareMatrixRows, (a, b) =>
      compareStrings(a.descrizione, b.descrizione),
    );
  }, [data, sortColumn, sortDirection]);

  return (
    <div className="requirement-matrix">
      <div className="requirement-matrix-filters">
        <label className="requirement-matrix-filter">
          <span>Cerca requisito</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Descrizione, soglia, documento..."
          />
        </label>
        <label className="requirement-matrix-filter">
          <span>Categoria</span>
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value as RequirementCategoria | "")}
          >
            {REQUIREMENT_CATEGORIA_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="requirement-matrix-filter">
          <span>Tipo</span>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as RequirementTipo | "")}
          >
            {TIPO_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="requirement-matrix-filter">
          <span>Esito</span>
          <select
            value={esitoFilter}
            onChange={(e) => setEsitoFilter(e.target.value as MatrixEsito | "")}
          >
            {MATRIX_ESITO_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {data && data.companies.length > 1 && (
          <label className="requirement-matrix-filter">
            <span>Azienda</span>
            <select
              value={companyFilter}
              onChange={(e) => {
                const value = e.target.value;
                setCompanyFilter(value ? Number(value) : "");
              }}
            >
              <option value="">Tutte le aziende</option>
              {data.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {data && (
        <div className="requirement-matrix-summary">
          {(Object.keys(MATRIX_ESITO_LABELS) as MatrixEsito[]).map((esito) => (
            <div key={esito} className={`requirement-matrix-summary-item requirement-matrix-summary-item--${esito}`}>
              <span>{MATRIX_ESITO_LABELS[esito]}</span>
              <strong>{data.summary[esito] ?? 0}</strong>
            </div>
          ))}
          <div className="requirement-matrix-summary-meta">
            {data.requirements.length} requisiti · {visibleCompanies.length} aziende
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="requirement-matrix-status">Calcolo matrice in corso...</p>
      ) : isError ? (
        <p className="requirement-matrix-status requirement-matrix-status--error">
          Errore: {error instanceof Error ? error.message : "caricamento non riuscito"}
        </p>
      ) : !data || data.companies.length === 0 ? (
        <p className="requirement-matrix-status">
          Nessuna azienda registrata.{" "}
          <Link to="/companies/new">Aggiungi un&apos;azienda</Link> per popolare la matrice.
        </p>
      ) : data.requirements.length === 0 ? (
        <p className="requirement-matrix-status">
          Nessun requisito corrisponde ai filtri selezionati. Verifica che i documenti della gara
          siano stati analizzati.
        </p>
      ) : (
        <div className="requirement-matrix-scroll">
          <table className="requirement-matrix-table">
            <thead>
              <tr>
                <th className="matrix-corner">
                  <button
                    type="button"
                    className={`sortable-table-btn${sortColumn === "requisito" ? " sortable-table-btn--active" : ""}`}
                    onClick={() => handleSort("requisito")}
                  >
                    <span>Requisito</span>
                    <span className="sortable-table-icon" aria-hidden>
                      {sortColumn === "requisito"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
                {visibleCompanies.map((company) => (
                  <th key={company.id} className="matrix-company-header">
                    <Link to={`/companies/${company.id}`}>{company.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRequirements.map((row) => (
                <MatrixRow
                  key={row.requirement_id}
                  row={row}
                  companies={visibleCompanies}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="requirement-matrix-legend" aria-label="Legenda esiti">
        <span className="matrix-legend-item matrix-legend-item--verde">Soddisfatto</span>
        <span className="matrix-legend-item matrix-legend-item--giallo">Soddisfatto parzialmente</span>
        <span className="matrix-legend-item matrix-legend-item--rosso">Non soddisfatto</span>
      </div>
    </div>
  );
}
