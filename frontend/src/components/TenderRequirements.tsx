import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTenderRequirements } from "../api/tenderRequirements";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import { compareOptionalStrings, compareStrings, sortRows } from "../utils/tableSort";
import { TenderRequirementDetail } from "./TenderRequirementDetail";
import {
  REQUIREMENT_CATEGORIA_LABELS,
  REQUIREMENT_CATEGORIA_OPTIONS,
  REQUIREMENT_TIPO_DESCRIPTIONS,
  REQUIREMENT_TIPO_LABELS,
  requirementTipologiaLabel,
  type RequirementCategoria,
  type RequirementTipo,
  type TenderRequirement,
} from "../types/tenderRequirement";
import "./TenderRequirements.css";

interface TenderRequirementsProps {
  tenderId: number;
  isProcessing?: boolean;
}

const TIPO_ORDER: RequirementTipo[] = ["obbligatorio", "tecnico", "economico"];

type SortColumn = "descrizione" | "categoria" | "tipologia" | "soglia";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "descrizione", label: "Descrizione" },
  { id: "categoria", label: "Categoria" },
  { id: "tipologia", label: "Tipologia" },
  { id: "soglia", label: "Soglia" },
];

function compareRequirements(a: TenderRequirement, b: TenderRequirement, column: SortColumn): number {
  switch (column) {
    case "descrizione":
      return compareStrings(a.descrizione, b.descrizione);
    case "categoria":
      return compareStrings(a.categoria, b.categoria);
    case "tipologia":
      return compareStrings(requirementTipologiaLabel(a), requirementTipologiaLabel(b));
    case "soglia":
      return compareOptionalStrings(a.soglia_minima || a.soglia, b.soglia_minima || b.soglia);
  }
}

function tipoBadgeClass(tipo: RequirementTipo): string {
  return `tender-requirements-badge tender-requirements-badge--${tipo}`;
}

function groupByTipo(requirements: TenderRequirement[]) {
  const groups: Record<RequirementTipo, TenderRequirement[]> = {
    obbligatorio: [],
    tecnico: [],
    economico: [],
  };

  for (const req of requirements) {
    groups[req.tipo].push(req);
  }

  return groups;
}

export function TenderRequirements({ tenderId, isProcessing }: TenderRequirementsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<RequirementCategoria | "">("");
  const [tipoFilter, setTipoFilter] = useState<RequirementTipo | "">("");
  const [onlyObbligatori, setOnlyObbligatori] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<TenderRequirement | null>(null);

  const filters = useMemo(
    () => ({
      q: searchQuery,
      categoria: categoriaFilter,
      tipo: tipoFilter,
      obbligatorio: onlyObbligatori || undefined,
    }),
    [searchQuery, categoriaFilter, tipoFilter, onlyObbligatori],
  );

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ["tenders", tenderId, "requirements", filters],
    queryFn: () => fetchTenderRequirements(tenderId, filters),
    refetchInterval: isProcessing ? 2000 : false,
  });

  const groups = groupByTipo(requirements);
  const counts = {
    obbligatorio: groups.obbligatorio.length,
    tecnico: groups.tecnico.length,
    economico: groups.economico.length,
  };

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>("descrizione", "asc");

  return (
    <section className="tender-requirements">
      <div className={`tender-requirements-layout${selectedRequirement ? " tender-requirements-layout--with-detail" : ""}`}>
        <div className="tender-requirements-card">
        <div className="tender-requirements-header">
          <h3>Requisiti</h3>
          <p>Requisiti estratti automaticamente dai documenti della gara.</p>
        </div>

        <div className="tender-requirements-filters">
          <label className="tender-requirements-filter">
            <span>Cerca</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Descrizione, note, documento..."
            />
          </label>
          <label className="tender-requirements-filter">
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
          <label className="tender-requirements-filter">
            <span>Tipo</span>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as RequirementTipo | "")}
            >
              <option value="">Tutti</option>
              {TIPO_ORDER.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {REQUIREMENT_TIPO_LABELS[tipo]}
                </option>
              ))}
            </select>
          </label>
          <label className="tender-requirements-filter tender-requirements-filter--checkbox">
            <input
              type="checkbox"
              checked={onlyObbligatori}
              onChange={(e) => setOnlyObbligatori(e.target.checked)}
            />
            Solo obbligatori
          </label>
        </div>

        <div className="tender-requirements-summary">
          {TIPO_ORDER.map((tipo) => (
            <div
              key={tipo}
              className={`tender-requirements-summary-item tender-requirements-summary-item--${tipo}`}
            >
              <span className={tipoBadgeClass(tipo)}>{REQUIREMENT_TIPO_LABELS[tipo]}</span>
              <strong>{counts[tipo]}</strong>
              <span className="tender-requirements-summary-desc">
                {REQUIREMENT_TIPO_DESCRIPTIONS[tipo]}
              </span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="tender-requirements-loading">Caricamento requisiti...</p>
        ) : requirements.length === 0 ? (
          <p className="tender-requirements-empty">
            Nessun requisito estratto. Carica un documento per avviare l&apos;analisi.
          </p>
        ) : (
          <div className="tender-requirements-groups">
            {TIPO_ORDER.map((tipo) => {
              const items = sortRows(
                groups[tipo],
                sortColumn,
                sortDirection,
                compareRequirements,
                (a, b) => compareStrings(a.descrizione, b.descrizione),
              );
              if (items.length === 0) return null;

              return (
                <div key={tipo} className="tender-requirements-group">
                  <div className="tender-requirements-group-header">
                    <span className={tipoBadgeClass(tipo)}>{REQUIREMENT_TIPO_LABELS[tipo]}</span>
                    <span className="tender-requirements-group-count">
                      {items.length} {items.length === 1 ? "requisito" : "requisiti"}
                    </span>
                  </div>

                  <div className="tender-requirements-table-card">
                    <table className="tender-requirements-table">
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
                          <th aria-label="Azioni" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((req) => (
                          <tr key={req.id}>
                            <td>
                              <div className="tender-requirements-desc-cell">
                                <span>{req.descrizione}</span>
                                {req.documento_origine && (
                                  <span className="tender-requirements-origin">
                                    {req.documento_origine}
                                    {req.pagina_origine ? ` · pag. ${req.pagina_origine}` : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="tender-requirements-categoria">
                                {REQUIREMENT_CATEGORIA_LABELS[req.categoria]}
                              </span>
                            </td>
                            <td>
                              <span className="tender-requirements-tipologia">
                                {requirementTipologiaLabel(req)}
                              </span>
                            </td>
                            <td>
                              {req.soglia_minima || req.soglia ? (
                                <span className="tender-requirements-soglia">
                                  {req.soglia_minima || req.soglia}
                                </span>
                              ) : (
                                <span className="tender-requirements-soglia-empty">—</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`tender-requirements-detail-btn${selectedRequirement?.id === req.id ? " tender-requirements-detail-btn--active" : ""}`}
                                onClick={() =>
                                  setSelectedRequirement((current) =>
                                    current?.id === req.id ? null : req,
                                  )
                                }
                              >
                                {selectedRequirement?.id === req.id ? "Chiudi" : "Dettaglio"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {selectedRequirement && (
          <TenderRequirementDetail
            tenderId={tenderId}
            requirementId={selectedRequirement.id}
            fallback={selectedRequirement}
            onClose={() => setSelectedRequirement(null)}
          />
        )}
      </div>
    </section>
  );
}
