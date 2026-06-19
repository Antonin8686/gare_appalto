import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTenderEvaluations, runTenderEvaluations } from "../api/evaluation";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import { compareOptionalStrings, compareStrings, sortRows } from "../utils/tableSort";
import {
  SEMAFORO_DESCRIPTIONS,
  SEMAFORO_LABELS,
  type RequirementEvaluation,
  type Semaforo,
  type TenderEvaluation,
} from "../types/evaluation";
import "./TenderCompatibility.css";

type SortColumn = "company" | "semaforo" | "motivazione";
type DetailSortColumn = "requisito" | "soglia" | "esito" | "motivo";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "company", label: "Azienda" },
  { id: "semaforo", label: "Semaforo" },
  { id: "motivazione", label: "Motivazione" },
];

const DETAIL_COLUMNS: { id: DetailSortColumn; label: string }[] = [
  { id: "requisito", label: "Requisito" },
  { id: "soglia", label: "Soglia" },
  { id: "esito", label: "Esito" },
  { id: "motivo", label: "Motivo" },
];

const SEMAFORO_SORT_ORDER: Record<Semaforo, number> = { verde: 0, giallo: 1, rosso: 2 };

interface TenderCompatibilityProps {
  tenderId: number;
}

const SEMAFORO_ORDER: Semaforo[] = ["verde", "giallo", "rosso"];

function semaforoClass(semaforo: Semaforo): string {
  return `compatibility-semaforo compatibility-semaforo--${semaforo}`;
}

function esitoClass(esito: Semaforo): string {
  return `compatibility-esito compatibility-esito--${esito}`;
}

function countBySemaforo(evaluations: TenderEvaluation[]) {
  const counts: Record<Semaforo, number> = { verde: 0, giallo: 0, rosso: 0 };
  for (const evaluation of evaluations) {
    counts[evaluation.semaforo] += 1;
  }
  return counts;
}

function compareEvaluations(a: TenderEvaluation, b: TenderEvaluation, column: SortColumn): number {
  switch (column) {
    case "company":
      return compareStrings(a.company_name, b.company_name);
    case "semaforo":
      return (SEMAFORO_SORT_ORDER[a.semaforo] ?? 0) - (SEMAFORO_SORT_ORDER[b.semaforo] ?? 0);
    case "motivazione":
      return compareStrings(a.motivazione, b.motivazione);
  }
}

function compareEvaluationDetails(
  a: RequirementEvaluation,
  b: RequirementEvaluation,
  column: DetailSortColumn,
): number {
  switch (column) {
    case "requisito":
      return compareStrings(a.descrizione, b.descrizione);
    case "soglia":
      return compareOptionalStrings(a.soglia, b.soglia);
    case "esito":
      return (SEMAFORO_SORT_ORDER[a.esito] ?? 0) - (SEMAFORO_SORT_ORDER[b.esito] ?? 0);
    case "motivo":
      return compareStrings(a.motivo, b.motivo);
  }
}

export function TenderCompatibility({ tenderId }: TenderCompatibilityProps) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["tenders", tenderId, "evaluations"],
    queryFn: () => fetchTenderEvaluations(tenderId),
  });

  const evaluateMutation = useMutation({
    mutationFn: () => runTenderEvaluations(tenderId),
    onSuccess: (data) => {
      queryClient.setQueryData(["tenders", tenderId, "evaluations"], data);
    },
  });

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>("semaforo", "asc");
  const {
    sortColumn: detailSortColumn,
    sortDirection: detailSortDirection,
    handleSort: handleDetailSort,
  } = useTableSort<DetailSortColumn>("requisito", "asc");

  const sortedEvaluations = useMemo(
    () =>
      sortRows(evaluations, sortColumn, sortDirection, compareEvaluations, (a, b) =>
        compareStrings(a.company_name, b.company_name),
      ),
    [evaluations, sortColumn, sortDirection],
  );

  const counts = countBySemaforo(evaluations);
  const hasEvaluations = evaluations.length > 0;

  function toggleExpanded(companyId: number) {
    setExpandedId((current) => (current === companyId ? null : companyId));
  }

  return (
    <section className="compatibility">
      <div className="compatibility-card">
        <div className="compatibility-header">
          <div>
            <h3>Compatibilità</h3>
            <p>
              Valutazione automatica delle aziende rispetto ai requisiti della gara.
            </p>
          </div>
          <button
            type="button"
            className="compatibility-evaluate-btn"
            onClick={() => evaluateMutation.mutate()}
            disabled={evaluateMutation.isPending}
          >
            {evaluateMutation.isPending ? "Valutazione in corso..." : "Valuta compatibilità"}
          </button>
        </div>

        {evaluateMutation.isError && (
          <p className="compatibility-error">
            Errore:{" "}
            {evaluateMutation.error instanceof Error
              ? evaluateMutation.error.message
              : "valutazione non riuscita"}
          </p>
        )}

        {hasEvaluations && (
          <div className="compatibility-summary">
            {SEMAFORO_ORDER.map((semaforo) => (
              <div
                key={semaforo}
                className={`compatibility-summary-item compatibility-summary-item--${semaforo}`}
              >
                <span className={semaforoClass(semaforo)}>
                  <span className="compatibility-semaforo__dot" aria-hidden />
                  {SEMAFORO_LABELS[semaforo]}
                </span>
                <strong>{counts[semaforo]}</strong>
                <span className="compatibility-summary-desc">
                  {SEMAFORO_DESCRIPTIONS[semaforo]}
                </span>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="compatibility-loading">Caricamento valutazioni...</p>
        ) : !hasEvaluations ? (
          <p className="compatibility-empty">
            Nessuna valutazione disponibile. Clicca &quot;Valuta compatibilità&quot; per
            analizzare le aziende registrate rispetto ai requisiti della gara.
          </p>
        ) : (
          <div className="compatibility-table-card">
            <table className="compatibility-table">
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
                  <th aria-label="Dettagli" />
                </tr>
              </thead>
              <tbody>
                {sortedEvaluations.map((evaluation) => {
                  const sortedDetails = sortRows(
                    evaluation.dettagli,
                    detailSortColumn,
                    detailSortDirection,
                    compareEvaluationDetails,
                    (a, b) => compareStrings(a.descrizione, b.descrizione),
                  );

                  return (
                  <Fragment key={evaluation.company_id}>
                    <tr>
                      <td>
                        <Link
                          to={`/companies/${evaluation.company_id}`}
                          className="compatibility-company-link"
                        >
                          {evaluation.company_name}
                        </Link>
                      </td>
                      <td>
                        <span className={semaforoClass(evaluation.semaforo)}>
                          <span className="compatibility-semaforo__dot" aria-hidden />
                          {SEMAFORO_LABELS[evaluation.semaforo]}
                        </span>
                      </td>
                      <td className="compatibility-motivazione">
                        {evaluation.motivazione}
                      </td>
                      <td>
                        {evaluation.dettagli.length > 0 && (
                          <button
                            type="button"
                            className="compatibility-details-btn"
                            onClick={() => toggleExpanded(evaluation.company_id)}
                          >
                            {expandedId === evaluation.company_id
                              ? "Nascondi dettagli"
                              : "Mostra dettagli"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === evaluation.company_id && (
                      <tr className="compatibility-details-row">
                        <td colSpan={4}>
                          <div className="compatibility-details">
                            <p className="compatibility-details-meta">
                              Valutato il{" "}
                              {new Date(evaluation.evaluated_at).toLocaleString("it-IT")}
                            </p>
                            <table className="compatibility-details-table">
                              <thead>
                                <tr>
                                  {DETAIL_COLUMNS.map(({ id, label }) => (
                                    <SortableTableHeader
                                      key={id}
                                      column={id}
                                      label={label}
                                      activeColumn={detailSortColumn}
                                      direction={detailSortDirection}
                                      onSort={handleDetailSort}
                                    />
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sortedDetails.map((detail) => (
                                  <tr key={detail.requirement_id}>
                                    <td>{detail.descrizione}</td>
                                    <td>
                                      {detail.soglia || (
                                        <span className="compatibility-soglia-empty">—</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={esitoClass(detail.esito)}>
                                        {SEMAFORO_LABELS[detail.esito]}
                                      </span>
                                    </td>
                                    <td>{detail.motivo}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
