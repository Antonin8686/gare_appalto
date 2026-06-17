import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CRITERION_LIVELLO_LABELS,
  CRITERION_LIVELLO_OPTIONS,
  type CriterionLivello,
  type EvaluationCriterionNode,
} from "../types/evaluationCriteria";
import "./EvaluationCriteriaTree.css";

interface EvaluationCriteriaTreeProps {
  tenderId: number;
  criteria: EvaluationCriterionNode[];
  summary: {
    criteri_count: number;
    punteggio_totale: string | null;
    elementi_premianti_count: number;
  };
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  livelloFilter: CriterionLivello | "";
  onLivelloChange: (value: CriterionLivello | "") => void;
}

function formatScore(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

function CriterionNode({
  node,
  tenderId,
  depth = 0,
}: {
  node: EvaluationCriterionNode;
  tenderId: number;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <li className={`criterion-node criterion-node--${node.livello}`}>
      <div className="criterion-node-row" style={{ paddingLeft: `${depth * 1.1 + 0.5}rem` }}>
        {hasChildren ? (
          <button
            type="button"
            className="criterion-node-toggle"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="criterion-node-toggle criterion-node-toggle--empty" aria-hidden />
        )}

        <div className="criterion-node-content">
          <div className="criterion-node-header">
            <span className={`criterion-node-badge criterion-node-badge--${node.livello}`}>
              {CRITERION_LIVELLO_LABELS[node.livello]}
            </span>
            <h4 className="criterion-node-title">{node.titolo}</h4>
          </div>

          {node.descrizione && (
            <p className="criterion-node-description">{node.descrizione}</p>
          )}

          <div className="criterion-node-scores">
            <span title="Punteggio massimo">
              Max: <strong>{formatScore(node.punteggio_massimo)}</strong>
            </span>
            <span title="Punteggio discrezionale">
              Discr.: <strong>{formatScore(node.punteggio_discrezionale)}</strong>
            </span>
            <span title="Punteggio tabellare">
              Tab.: <strong>{formatScore(node.punteggio_tabellare)}</strong>
            </span>
            {node.soglia_minima && (
              <span title="Soglia minima">
                Soglia: <strong>{node.soglia_minima}</strong>
              </span>
            )}
          </div>

          {node.elementi_premianti.length > 0 && (
            <ul className="criterion-node-premianti">
              {node.elementi_premianti.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          <div className="criterion-node-source">
            {node.document_id ? (
              <Link to={`/tenders/${tenderId}`} state={{ tab: "documenti" }}>
                {node.document_name || node.documento_origine}
              </Link>
            ) : (
              <span>{node.document_name || node.documento_origine || "Documento non indicato"}</span>
            )}
            {node.pagina_origine && <span> · pag. {node.pagina_origine}</span>}
            {node.paragrafo_origine && <span> · § {node.paragrafo_origine}</span>}
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <ul className="criterion-node-children">
          {node.children.map((child) => (
            <CriterionNode
              key={child.id}
              node={child}
              tenderId={tenderId}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EvaluationCriteriaTreeView({
  tenderId,
  criteria,
  summary,
  isLoading,
  searchQuery,
  onSearchChange,
  livelloFilter,
  onLivelloChange,
}: EvaluationCriteriaTreeProps) {
  const isEmpty = criteria.length === 0;

  const headerStats = useMemo(
    () => [
      { label: "Elementi", value: summary.criteri_count },
      { label: "Punteggio totale", value: summary.punteggio_totale ? formatScore(summary.punteggio_totale) : "—" },
      { label: "Elementi premianti", value: summary.elementi_premianti_count },
    ],
    [summary],
  );

  return (
    <section className="evaluation-criteria">
      <div className="evaluation-criteria-card">
        <div className="evaluation-criteria-header">
          <div>
            <h3>Criteri di valutazione</h3>
            <p>Struttura gerarchica estratta da disciplinari e griglie di valutazione.</p>
          </div>
        </div>

        <div className="evaluation-criteria-filters">
          <label className="evaluation-criteria-filter">
            <span>Cerca</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Titolo, descrizione..."
            />
          </label>
          <label className="evaluation-criteria-filter">
            <span>Livello</span>
            <select
              value={livelloFilter}
              onChange={(e) => onLivelloChange(e.target.value as CriterionLivello | "")}
            >
              {CRITERION_LIVELLO_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="evaluation-criteria-summary">
          {headerStats.map((stat) => (
            <div key={stat.label} className="evaluation-criteria-summary-item">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="evaluation-criteria-status">Caricamento criteri...</p>
        ) : isEmpty ? (
          <p className="evaluation-criteria-status">
            Nessun criterio estratto. Carica un disciplinare o una griglia di valutazione per
            avviare l&apos;analisi automatica.
          </p>
        ) : (
          <ul className="evaluation-criteria-tree" role="tree">
            {criteria.map((node) => (
              <CriterionNode key={node.id} node={node} tenderId={tenderId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
