import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchTender } from "../api/tenders";
import type { FormalRuleCategory, FormalRules } from "../types/tenderFormalRules";
import {
  countFormalRules,
  FORMAL_RULE_CATEGORIES,
  FORMAL_RULE_CATEGORY_DESCRIPTIONS,
  FORMAL_RULE_CATEGORY_LABELS,
} from "../types/tenderFormalRules";
import "./TenderFormalRules.css";

interface TenderFormalRulesProps {
  tenderId: number;
  formalRules: FormalRules;
  isProcessing?: boolean;
}

function categoryBadgeClass(category: FormalRuleCategory): string {
  return `tender-formal-rules-badge tender-formal-rules-badge--${category}`;
}

export function TenderFormalRules({
  tenderId,
  formalRules,
  isProcessing,
}: TenderFormalRulesProps) {
  const queryClient = useQueryClient();
  const { total, checked } = countFormalRules(formalRules);
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

  const mutation = useMutation({
    mutationFn: (nextRules: FormalRules) =>
      patchTender(tenderId, { formal_rules: nextRules }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["tenders", tenderId], updated);
    },
  });

  function toggleItem(category: FormalRuleCategory, itemId: string) {
    const nextRules: FormalRules = {
      ...formalRules,
      [category]: formalRules[category].map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    };
    mutation.mutate(nextRules);
  }

  return (
    <section className="tender-formal-rules">
      <div className="tender-formal-rules-card">
        <div className="tender-formal-rules-header">
          <h3>Regole formali</h3>
          <p>
            Vincoli formali estratti dai documenti. Spunta ogni voce al completamento.
          </p>
        </div>

        <div className="tender-formal-rules-progress">
          <div className="tender-formal-rules-progress-text">
            <strong>{checked}</strong> di <strong>{total}</strong> completate
            {total > 0 && <span className="tender-formal-rules-progress-pct">({progress}%)</span>}
          </div>
          <div
            className="tender-formal-rules-progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avanzamento regole formali"
          >
            <div
              className="tender-formal-rules-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {mutation.isError && (
          <p className="tender-formal-rules-error">
            Salvataggio non riuscito. Riprova.
          </p>
        )}

        {total === 0 ? (
          <p className="tender-formal-rules-empty">
            {isProcessing
              ? "Analisi documenti in corso..."
              : "Nessuna regola formale estratta. Carica un documento per avviare l'analisi."}
          </p>
        ) : (
          <div className="tender-formal-rules-groups">
            {FORMAL_RULE_CATEGORIES.map((category) => {
              const items = formalRules[category];
              if (items.length === 0) return null;

              const categoryChecked = items.filter((item) => item.checked).length;

              return (
                <div key={category} className="tender-formal-rules-group">
                  <div className="tender-formal-rules-group-header">
                    <span className={categoryBadgeClass(category)}>
                      {FORMAL_RULE_CATEGORY_LABELS[category]}
                    </span>
                    <span className="tender-formal-rules-group-count">
                      {categoryChecked}/{items.length} completate
                    </span>
                  </div>
                  <p className="tender-formal-rules-group-desc">
                    {FORMAL_RULE_CATEGORY_DESCRIPTIONS[category]}
                  </p>

                  <ul className="tender-formal-rules-checklist">
                    {items.map((item) => {
                      const inputId = `formal-rule-${category}-${item.id}`;

                      return (
                        <li
                          key={item.id}
                          className={`tender-formal-rules-item${
                            item.checked ? " tender-formal-rules-item--checked" : ""
                          }`}
                        >
                          <label htmlFor={inputId} className="tender-formal-rules-label">
                            <input
                              id={inputId}
                              type="checkbox"
                              className="tender-formal-rules-checkbox"
                              checked={item.checked}
                              disabled={mutation.isPending}
                              onChange={() => toggleItem(category, item.id)}
                            />
                            <span className="tender-formal-rules-checkmark" aria-hidden="true" />
                            <span className="tender-formal-rules-content">
                              <span className="tender-formal-rules-item-label">{item.label}</span>
                              {item.detail && (
                                <span className="tender-formal-rules-item-detail">
                                  {item.detail}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
