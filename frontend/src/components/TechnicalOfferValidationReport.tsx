import {
  VALIDATION_SEVERITY_LABELS,
  VALIDATION_TYPE_LABELS,
  groupWarningsByType,
  type TechnicalRelationValidationResult,
  type ValidationSeverity,
  type ValidationWarning,
} from "../types/technicalRelationValidation";
import "./TechnicalOfferValidationReport.css";

interface TechnicalOfferValidationReportProps {
  validation: TechnicalRelationValidationResult | null;
  isLoading: boolean;
  isRefreshing?: boolean;
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
}

const SEVERITY_ORDER: ValidationSeverity[] = ["rosso", "giallo", "info"];

function severityClass(severity: ValidationSeverity): string {
  return `offer-validation-severity offer-validation-severity--${severity}`;
}

function WarningRow({
  warning,
  activeSectionId,
  onSelectSection,
}: {
  warning: ValidationWarning;
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
}) {
  const isActive = warning.section_id === activeSectionId;

  return (
    <li
      className={`offer-validation-item${isActive ? " offer-validation-item--active" : ""}`}
    >
      <div className="offer-validation-item-header">
        <span className={severityClass(warning.severity)}>
          {VALIDATION_SEVERITY_LABELS[warning.severity]}
        </span>
        <span className="offer-validation-item-type">
          {VALIDATION_TYPE_LABELS[warning.type]}
        </span>
      </div>
      <p className="offer-validation-item-message">{warning.message}</p>
      {warning.detail && (
        <p className="offer-validation-item-detail">{warning.detail}</p>
      )}
      {warning.section_id && (
        <button
          type="button"
          className="offer-validation-item-link"
          onClick={() => onSelectSection(warning.section_id!)}
        >
          Vai alla sezione
        </button>
      )}
    </li>
  );
}

export function TechnicalOfferValidationReport({
  validation,
  isLoading,
  isRefreshing = false,
  activeSectionId,
  onSelectSection,
}: TechnicalOfferValidationReportProps) {
  if (isLoading && !validation) {
    return (
      <div className="offer-validation offer-validation--loading">
        <p className="offer-validation-loading">Analisi criticità in corso...</p>
      </div>
    );
  }

  if (!validation) {
    return null;
  }

  const { summary, page_stats, warnings } = validation;
  const grouped = groupWarningsByType(warnings);

  return (
    <div className={`offer-validation${isRefreshing ? " offer-validation--refreshing" : ""}`}>
      <div className="offer-validation-header">
        <div>
          <h4>Report criticità</h4>
          <p>Controllo automatico su pagine, coerenza e requisiti.</p>
        </div>
        <div className="offer-validation-header-actions">
          {isRefreshing && (
            <span className="offer-validation-refreshing" aria-live="polite">
              Aggiornamento...
            </span>
          )}
          {summary.totale > 0 ? (
          <div className="offer-validation-summary">
            {SEVERITY_ORDER.map((severity) =>
              summary[severity] > 0 ? (
                <span key={severity} className={severityClass(severity)}>
                  {summary[severity]} {VALIDATION_SEVERITY_LABELS[severity].toLowerCase()}
                </span>
              ) : null,
            )}
          </div>
          ) : (
          <span className="offer-validation-ok">Nessuna criticità rilevata</span>
        )}
        </div>
      </div>

      {page_stats.max_pages !== null && (
        <div className="offer-validation-page-stats">
          <span>
            Stimate: <strong>{page_stats.total_estimated_pages}</strong>
            {page_stats.max_pages !== null && (
              <> / {page_stats.max_pages} max</>
            )}
          </span>
          <span>
            Pianificate: <strong>{page_stats.total_suggested_pages}</strong>
          </span>
        </div>
      )}

      {summary.totale === 0 ? (
        <p className="offer-validation-empty">
          L&apos;offerta tecnica non presenta problemi rilevati dai controlli automatici.
        </p>
      ) : (
        <div className="offer-validation-groups">
          {(["pagine", "coerenza", "requisiti"] as const).map((type) => {
            const typeWarnings = grouped[type];
            if (typeWarnings.length === 0) return null;
            return (
              <div key={type} className="offer-validation-group">
                <h5>
                  {VALIDATION_TYPE_LABELS[type]}
                  <span className="offer-validation-group-count">{typeWarnings.length}</span>
                </h5>
                <ul className="offer-validation-list">
                  {typeWarnings.map((warning) => (
                    <WarningRow
                      key={warning.id}
                      warning={warning}
                      activeSectionId={activeSectionId}
                      onSelectSection={onSelectSection}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
