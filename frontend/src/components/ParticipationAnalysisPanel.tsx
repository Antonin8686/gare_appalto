import { useMemo } from "react";
import type {
  ParticipationAnalysis,
  ParticipationCriticita,
  ParticipationSuggestion,
  RequirementCoverage,
} from "../types/participation";
import { COVERAGE_ESITO_LABELS } from "../types/participation";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import { compareOptionalStrings, compareStrings, sortRows } from "../utils/tableSort";
import "./ParticipationAnalysisPanel.css";

type SortColumn = "descrizione" | "esito" | "company" | "valori";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "descrizione", label: "Requisito" },
  { id: "esito", label: "Esito" },
  { id: "company", label: "Impresa" },
  { id: "valori", label: "Posseduto / Richiesto" },
];

interface ParticipationAnalysisPanelProps {
  suggestion?: ParticipationSuggestion | null;
  analysis: ParticipationAnalysis | null;
  isLoading?: boolean;
}

function criticitaClass(severita: ParticipationCriticita["severita"]): string {
  return `participation-criticita participation-criticita--${severita}`;
}

function compareRequisiti(
  a: RequirementCoverage,
  b: RequirementCoverage,
  column: SortColumn,
): number {
  switch (column) {
    case "descrizione":
      return compareStrings(a.descrizione, b.descrizione);
    case "esito":
      return compareStrings(a.esito, b.esito);
    case "company":
      return compareOptionalStrings(a.company_name, b.company_name);
    case "valori":
      return compareStrings(
        `${a.valore_posseduto}/${a.valore_richiesto}`,
        `${b.valore_posseduto}/${b.valore_richiesto}`,
      );
  }
}

export function ParticipationAnalysisPanel({
  suggestion,
  analysis,
  isLoading,
}: ParticipationAnalysisPanelProps) {
  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>("descrizione", "asc");

  const sortedRequisiti = useMemo(() => {
    if (!analysis) return [];
    return sortRows(analysis.requisiti, sortColumn, sortDirection, compareRequisiti, (a, b) =>
      compareStrings(a.descrizione, b.descrizione),
    );
  }, [analysis, sortColumn, sortDirection]);

  if (isLoading) {
    return <p className="participation-analysis-loading">Analisi in corso...</p>;
  }

  if (!analysis) {
    return (
      <p className="participation-analysis-empty">
        Configura la composizione per visualizzare copertura e criticità.
      </p>
    );
  }

  const { copertura, criticita } = analysis;

  return (
    <div className="participation-analysis">
      {suggestion && (
        <section className="participation-suggestion-card">
          <div className="participation-suggestion-header">
            <h4>Suggerimento automatico</h4>
            <span className={`participation-confidenza participation-confidenza--${suggestion.confidenza}`}>
              Confidenza {suggestion.confidenza}
            </span>
          </div>
          <p className="participation-suggestion-forma">{suggestion.forma_label}</p>
          <p className="participation-suggestion-motivo">{suggestion.motivazione}</p>
        </section>
      )}

      <section className="participation-coverage-card">
        <h4>Copertura requisiti</h4>
        <div className="participation-coverage-stats">
          <div className="participation-coverage-stat participation-coverage-stat--verde">
            <strong>{copertura.soddisfatti}</strong>
            <span>Soddisfatti</span>
          </div>
          <div className="participation-coverage-stat participation-coverage-stat--giallo">
            <strong>{copertura.parziali}</strong>
            <span>Parziali</span>
          </div>
          <div className="participation-coverage-stat participation-coverage-stat--rosso">
            <strong>{copertura.non_soddisfatti}</strong>
            <span>Non soddisfatti</span>
          </div>
          <div className="participation-coverage-percent">
            <strong>{copertura.percentuale}%</strong>
            <span>Copertura complessiva</span>
          </div>
        </div>
        <div className="participation-coverage-bar" aria-hidden>
          <span
            className="participation-coverage-bar__verde"
            style={{ width: `${(copertura.soddisfatti / Math.max(copertura.totale, 1)) * 100}%` }}
          />
          <span
            className="participation-coverage-bar__giallo"
            style={{ width: `${(copertura.parziali / Math.max(copertura.totale, 1)) * 100}%` }}
          />
          <span
            className="participation-coverage-bar__rosso"
            style={{ width: `${(copertura.non_soddisfatti / Math.max(copertura.totale, 1)) * 100}%` }}
          />
        </div>
      </section>

      {criticita.length > 0 && (
        <section className="participation-criticita-card">
          <h4>Criticità ({criticita.length})</h4>
          <ul className="participation-criticita-list">
            {criticita.map((item) => (
              <li key={item.requirement_id} className={criticitaClass(item.severita)}>
                <div className="participation-criticita-top">
                  <span className="participation-criticita-esito">{item.esito_label}</span>
                  {item.company_name && (
                    <span className="participation-criticita-company">{item.company_name}</span>
                  )}
                </div>
                <p className="participation-criticita-desc">{item.descrizione}</p>
                <p className="participation-criticita-motivo">{item.motivazione}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sortedRequisiti.length > 0 && (
        <section className="participation-requisiti-card">
          <h4>Dettaglio requisiti</h4>
          <div className="participation-requisiti-table-wrap">
            <table className="participation-requisiti-table">
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
                </tr>
              </thead>
              <tbody>
                {sortedRequisiti.map((req) => (
                  <tr key={req.requirement_id} className={`participation-req-row--${req.semaforo}`}>
                    <td>{req.descrizione}</td>
                    <td>
                      <span className={`participation-req-esito participation-req-esito--${req.semaforo}`}>
                        {COVERAGE_ESITO_LABELS[req.esito]}
                      </span>
                    </td>
                    <td>{req.company_name || "—"}</td>
                    <td>
                      <span className="participation-req-values">
                        {req.valore_posseduto} / {req.valore_richiesto}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
