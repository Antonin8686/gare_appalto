import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCompanies } from "../api/companies";
import { analyzeParticipation, createRTI } from "../api/participation";
import { fetchTenderRequirements } from "../api/tenderRequirements";
import type {
  ParticipationAnalysis,
  ParticipationForma,
  ParticipationSuggestion,
} from "../types/participation";
import { FORMA_LABELS } from "../types/participation";
import type { Company } from "../types/company";
import "./RtiWizard.css";

interface MandanteDraft {
  company_id: number;
  quota_partecipazione: string;
  quota_esecuzione: string;
}

interface RtiWizardProps {
  tenderId: number;
  suggestion?: ParticipationSuggestion | null;
  onAnalysisChange?: (analysis: ParticipationAnalysis | null) => void;
  onSaved?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "Forma" },
  { id: 2, label: "Mandataria" },
  { id: 3, label: "Mandanti" },
  { id: 4, label: "Ripartizione" },
  { id: 5, label: "Riepilogo" },
];

function totalQuota(items: MandanteDraft[]): number {
  return items.reduce((sum, item) => sum + (Number(item.quota_partecipazione) || 0), 0);
}

export function RtiWizard({
  tenderId,
  suggestion,
  onAnalysisChange,
  onSaved,
}: RtiWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>(1);
  const [forma, setForma] = useState<ParticipationForma>("rti");
  const [mandatariaId, setMandatariaId] = useState<number | "">("");
  const [nome, setNome] = useState("");
  const [mandanti, setMandanti] = useState<MandanteDraft[]>([]);
  const [ripartizione, setRipartizione] = useState<Record<number, number>>({});
  const [analysis, setAnalysis] = useState<ParticipationAnalysis | null>(null);
  const [mandanteAddNotice, setMandanteAddNotice] = useState<string | null>(null);

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["tenders", tenderId, "requirements"],
    queryFn: () => fetchTenderRequirements(tenderId),
  });

  useEffect(() => {
    if (!suggestion) return;
    setForma(suggestion.forma === "singola" ? "rti" : suggestion.forma);
    if (suggestion.mandataria_id) {
      setMandatariaId(suggestion.mandataria_id);
    }
    if (suggestion.mandanti_ids.length > 0) {
      const quota = Math.floor(100 / (suggestion.mandanti_ids.length + 1));
      setMandanti(
        suggestion.mandanti_ids.map((companyId) => ({
          company_id: companyId,
          quota_partecipazione: String(quota),
          quota_esecuzione: String(quota),
        })),
      );
    }
  }, [suggestion]);

  const companyIds = useMemo(() => {
    const ids = new Set<number>();
    if (mandatariaId) ids.add(Number(mandatariaId));
    mandanti.forEach((m) => ids.add(m.company_id));
    return Array.from(ids);
  }, [mandatariaId, mandanti]);

  const analyzeMutation = useMutation({
    mutationFn: () =>
      analyzeParticipation(tenderId, {
        forma,
        company_ids: companyIds,
        ripartizione_requisiti: Object.fromEntries(
          Object.entries(ripartizione).map(([key, value]) => [String(key), value]),
        ),
      }),
    onSuccess: (data) => {
      setAnalysis(data.analisi);
      onAnalysisChange?.(data.analisi);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!mandatariaId) throw new Error("Seleziona la mandataria");
      const members = mandanti.map((mandante) => ({
        company_id: mandante.company_id,
        ruolo: "mandante" as const,
        quota_partecipazione: mandante.quota_partecipazione || "0",
        quota_esecuzione: mandante.quota_esecuzione || "0",
      }));
      return createRTI(tenderId, {
        mandataria_id: Number(mandatariaId),
        nome,
        ripartizione_requisiti: Object.fromEntries(
          Object.entries(ripartizione).map(([key, value]) => [String(key), value]),
        ),
        members,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders", tenderId, "rti"] });
      onSaved?.();
    },
  });

  useEffect(() => {
    if (companyIds.length === 0) return;
    const timer = window.setTimeout(() => {
      analyzeMutation.mutate();
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forma, companyIds.join(","), JSON.stringify(ripartizione)]);

  const availableMandantiCompanies = useMemo(
    () =>
      companies.filter(
        (company) =>
          company.id !== mandatariaId &&
          !mandanti.some((m) => m.company_id === company.id),
      ),
    [companies, mandatariaId, mandanti],
  );

  function addMandanteNoticeMessage(): string {
    if (companiesLoading) {
      return "Caricamento imprese in corso...";
    }
    if (companies.length === 0) {
      return "Non ci sono imprese registrate. Aggiungi almeno due imprese per comporre un RTI.";
    }
    if (availableMandantiCompanies.length > 0) {
      return "";
    }
    if (companies.length === 1 && mandatariaId) {
      return "C'è una sola impresa in anagrafica e non può essere sia mandataria sia mandante. Aggiungi almeno un'altra impresa.";
    }
    return "Tutte le imprese disponibili sono già state aggiunte come mandanti.";
  }

  function addMandante() {
    setMandanteAddNotice(null);
    const available = availableMandantiCompanies[0];
    if (!available) {
      setMandanteAddNotice(addMandanteNoticeMessage());
      return;
    }
    setMandanti((current) => [
      ...current,
      { company_id: available.id, quota_partecipazione: "0", quota_esecuzione: "0" },
    ]);
  }

  function updateMandante(index: number, patch: Partial<MandanteDraft>) {
    setMandanti((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeMandante(index: number) {
    setMandanti((current) => current.filter((_, i) => i !== index));
  }

  function companyName(id: number): string {
    return companies.find((c) => c.id === id)?.name ?? `Azienda #${id}`;
  }

  const quotaTotale = totalQuota(mandanti);
  const canProceedStep3 = mandanti.length > 0;
  const canSave = mandatariaId && forma === "rti";
  const canAddMandante = !companiesLoading && availableMandantiCompanies.length > 0;
  const mandanteAvailabilityHint = addMandanteNoticeMessage();

  return (
    <div className="rti-wizard">
      <nav className="rti-wizard-steps" aria-label="Passi wizard RTI">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rti-wizard-step${step === item.id ? " rti-wizard-step--active" : ""}${step > item.id ? " rti-wizard-step--done" : ""}`}
            onClick={() => setStep(item.id)}
          >
            <span className="rti-wizard-step-num">{item.id}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="rti-wizard-body">
        {step === 1 && (
          <section>
            <h4>Forma di partecipazione</h4>
            <p className="rti-wizard-hint">
              Scegli la forma da configurare. Il wizard salva la composizione RTI; per altre forme
              usa l&apos;analisi automatica.
            </p>
            <div className="rti-wizard-forma-grid">
              {(["rti", "consorzio", "avvalimento", "singola"] as ParticipationForma[]).map(
                (value) => (
                  <label key={value} className={`rti-wizard-forma${forma === value ? " rti-wizard-forma--active" : ""}`}>
                    <input
                      type="radio"
                      name="forma"
                      value={value}
                      checked={forma === value}
                      onChange={() => setForma(value)}
                    />
                    {FORMA_LABELS[value]}
                  </label>
                ),
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h4>Impresa mandataria</h4>
            <label className="rti-wizard-field">
              <span>Mandataria</span>
              <select
                value={mandatariaId}
                onChange={(e) => setMandatariaId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Seleziona...</option>
                {companies.map((company: Company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="rti-wizard-field">
              <span>Denominazione RTI (opzionale)</span>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Es. RTI Alpha-Beta"
              />
            </label>
          </section>
        )}

        {step === 3 && (
          <section>
            <div className="rti-wizard-section-header">
              <h4>Imprese mandanti</h4>
              <button
                type="button"
                className="rti-wizard-add-btn"
                onClick={addMandante}
                disabled={!canAddMandante}
                title={!canAddMandante ? mandanteAvailabilityHint : undefined}
              >
                + Aggiungi mandante
              </button>
            </div>
            <p className="rti-wizard-hint">
              Quote partecipazione totali mandanti: <strong>{quotaTotale}%</strong>
            </p>
            {!canAddMandante && mandanteAvailabilityHint && (
              <p className="rti-wizard-mandante-notice" role="status">
                {mandanteAvailabilityHint}{" "}
                {companies.length < 2 && (
                  <Link to="/companies/new">Aggiungi impresa</Link>
                )}
              </p>
            )}
            {mandanteAddNotice && (
              <p className="rti-wizard-mandante-notice rti-wizard-mandante-notice--error" role="alert">
                {mandanteAddNotice}{" "}
                {companies.length < 2 && (
                  <Link to="/companies/new">Aggiungi impresa</Link>
                )}
              </p>
            )}
            {mandanti.length === 0 ? (
              <p className="rti-wizard-empty">Aggiungi almeno un&apos;impresa mandante.</p>
            ) : (
              <div className="rti-wizard-mandanti">
                {mandanti.map((mandante, index) => (
                  <div key={`${mandante.company_id}-${index}`} className="rti-wizard-mandante-card">
                    <label className="rti-wizard-field">
                      <span>Impresa</span>
                      <select
                        value={mandante.company_id}
                        onChange={(e) =>
                          updateMandante(index, { company_id: Number(e.target.value) })
                        }
                      >
                        {companies
                          .filter(
                            (c) =>
                              c.id !== mandatariaId &&
                              (c.id === mandante.company_id ||
                                !mandanti.some((m) => m.company_id === c.id)),
                          )
                          .map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="rti-wizard-field">
                      <span>Quota partecipazione %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={mandante.quota_partecipazione}
                        onChange={(e) =>
                          updateMandante(index, { quota_partecipazione: e.target.value })
                        }
                      />
                    </label>
                    <label className="rti-wizard-field">
                      <span>Quota esecuzione %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={mandante.quota_esecuzione}
                        onChange={(e) =>
                          updateMandante(index, { quota_esecuzione: e.target.value })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="rti-wizard-remove-btn"
                      onClick={() => removeMandante(index)}
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 4 && (
          <section>
            <h4>Ripartizione requisiti</h4>
            <p className="rti-wizard-hint">
              Assegna ogni requisito all&apos;impresa responsabile della comprova.
            </p>
            {requirements.length === 0 ? (
              <p className="rti-wizard-empty">Nessun requisito estratto per questa gara.</p>
            ) : (
              <div className="rti-wizard-ripartizione">
                {requirements.map((req) => (
                  <label key={req.id} className="rti-wizard-ripartizione-row">
                    <span className="rti-wizard-ripartizione-desc">{req.descrizione}</span>
                    <select
                      value={ripartizione[req.id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : undefined;
                        setRipartizione((current) => {
                          const next = { ...current };
                          if (value) next[req.id] = value;
                          else delete next[req.id];
                          return next;
                        });
                      }}
                    >
                      <option value="">Migliore disponibile</option>
                      {companyIds.map((id) => (
                        <option key={id} value={id}>
                          {companyName(id)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 5 && (
          <section>
            <h4>Riepilogo composizione</h4>
            <dl className="rti-wizard-summary">
              <div>
                <dt>Forma</dt>
                <dd>{FORMA_LABELS[forma]}</dd>
              </div>
              <div>
                <dt>Mandataria</dt>
                <dd>{mandatariaId ? companyName(Number(mandatariaId)) : "—"}</dd>
              </div>
              <div>
                <dt>Mandanti</dt>
                <dd>
                  {mandanti.length === 0
                    ? "—"
                    : mandanti
                        .map(
                          (m) =>
                            `${companyName(m.company_id)} (${m.quota_partecipazione}% / ${m.quota_esecuzione}%)`,
                        )
                        .join(", ")}
                </dd>
              </div>
              {analysis && (
                <div>
                  <dt>Copertura</dt>
                  <dd>{analysis.copertura.percentuale}% ({analysis.copertura.soddisfatti} soddisfatti)</dd>
                </div>
              )}
            </dl>
            {forma === "rti" && (
              <button
                type="button"
                className="rti-wizard-save-btn"
                disabled={!canSave || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Salvataggio..." : "Salva composizione RTI"}
              </button>
            )}
            {saveMutation.isError && (
              <p className="rti-wizard-error">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : "Salvataggio non riuscito"}
              </p>
            )}
            {forma !== "rti" && (
              <p className="rti-wizard-hint">
                Il salvataggio strutturato è disponibile per la forma RTI. Usa l&apos;analisi a
                destra per valutare le altre forme.
              </p>
            )}
          </section>
        )}
      </div>

      <footer className="rti-wizard-footer">
        <button
          type="button"
          className="rti-wizard-nav-btn"
          disabled={step === 1}
          onClick={() => setStep((current) => (current - 1) as WizardStep)}
        >
          Indietro
        </button>
        {analyzeMutation.isPending && (
          <span className="rti-wizard-analyzing">Aggiornamento analisi...</span>
        )}
        <button
          type="button"
          className="rti-wizard-nav-btn rti-wizard-nav-btn--primary"
          disabled={step === 5 || (step === 3 && !canProceedStep3)}
          onClick={() => setStep((current) => (current + 1) as WizardStep)}
        >
          Avanti
        </button>
      </footer>
    </div>
  );
}
