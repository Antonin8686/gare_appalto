import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchCompanies } from "../api/companies";
import {
  fetchTechnicalRelation,
  fetchTechnicalRelationVersions,
  generateTechnicalRelationOutline,
  patchTechnicalRelation,
  restoreTechnicalRelationVersion,
  validateTechnicalRelation,
} from "../api/tenderTechnicalRelation";
import { TechnicalOfferPreview } from "./TechnicalOfferPreview";
import { TechnicalOfferSectionItem } from "./TechnicalOfferSectionItem";
import { TechnicalOfferValidationReport } from "./TechnicalOfferValidationReport";
import { TechnicalRelationAiAssistant } from "./TechnicalRelationAiAssistant";
import type { TechnicalRelationSection } from "../types/tenderTechnicalRelation";
import {
  countCompletedSections,
  reorderSections,
  sectionsSaveFingerprint,
  sortSectionsByOrder,
} from "../types/tenderTechnicalRelation";
import {
  VALIDATION_SEVERITY_LABELS,
  highestSeverity,
  warningsForSection,
  type TechnicalRelationValidationResult,
} from "../types/technicalRelationValidation";
import "./TenderTechnicalOffer.css";

const AUTOSAVE_DELAY_MS = 1000;
const VALIDATION_DELAY_MS = 800;

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface TenderTechnicalOfferProps {
  tenderId: number;
}

export function TenderTechnicalOffer({ tenderId }: TenderTechnicalOfferProps) {
  const queryClient = useQueryClient();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [draftSections, setDraftSections] = useState<TechnicalRelationSection[]>([]);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [validation, setValidation] = useState<TechnicalRelationValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const savedFingerprintRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationRequestRef = useRef(0);
  const layoutRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: relation, isLoading, isError } = useQuery({
    queryKey: ["tenders", tenderId, "technical-relation"],
    queryFn: () => fetchTechnicalRelation(tenderId),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["tenders", tenderId, "technical-relation", "versions"],
    queryFn: () => fetchTechnicalRelationVersions(tenderId),
    enabled: !!relation,
  });

  const hasOutline = (relation?.outline.criteria.length ?? 0) > 0;

  const syncFromServer = (sections: TechnicalRelationSection[], nextCompanyId: number | "") => {
    const sorted = sortSectionsByOrder(sections);
    setDraftSections(sorted);
    setCompanyId(nextCompanyId);
    savedFingerprintRef.current = sectionsSaveFingerprint(
      sorted,
      nextCompanyId === "" ? null : nextCompanyId,
    );
    setSaveStatus("idle");
  };

  useEffect(() => {
    if (!relation) return;

    syncFromServer(relation.sections, relation.company_id ?? "");
    if (relation.sections.length > 0) {
      setActiveSectionId((current) => current ?? relation.sections[0].id);
    }
  }, [relation?.id]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      sections: TechnicalRelationSection[];
      companyId: number | "";
    }) =>
      patchTechnicalRelation(tenderId, {
        company_id: payload.companyId === "" ? null : payload.companyId,
        sections: payload.sections,
      }),
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(["tenders", tenderId, "technical-relation"], updated);
      savedFingerprintRef.current = sectionsSaveFingerprint(
        variables.sections,
        variables.companyId === "" ? null : variables.companyId,
      );
      setSaveStatus("saved");
      if (savedStatusTimerRef.current) {
        clearTimeout(savedStatusTimerRef.current);
      }
      savedStatusTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
      void queryClient.invalidateQueries({
        queryKey: ["tenders", tenderId, "technical-relation", "versions"],
      });
    },
    onError: () => {
      setSaveStatus("error");
    },
  });

  useEffect(() => {
    if (!relation || draftSections.length === 0) return;

    const fingerprint = sectionsSaveFingerprint(
      draftSections,
      companyId === "" ? null : companyId,
    );
    if (fingerprint === savedFingerprintRef.current) {
      return;
    }

    setSaveStatus("pending");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate({ sections: draftSections, companyId });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [draftSections, companyId, relation]);

  useEffect(
    () => () => {
      if (savedStatusTimerRef.current) {
        clearTimeout(savedStatusTimerRef.current);
      }
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasOutline || draftSections.length === 0) {
      setValidation(null);
      setIsValidating(false);
      return;
    }

    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    const requestId = ++validationRequestRef.current;
    setIsValidating(true);

    validationTimerRef.current = setTimeout(async () => {
      try {
        const result = await validateTechnicalRelation(tenderId, draftSections);
        if (validationRequestRef.current === requestId) {
          setValidation(result);
        }
      } catch {
        // Mantieni l'ultimo report valido in caso di errore temporaneo.
      } finally {
        if (validationRequestRef.current === requestId) {
          setIsValidating(false);
        }
      }
    }, VALIDATION_DELAY_MS);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [draftSections, tenderId, hasOutline]);

  const generateMutation = useMutation({
    mutationFn: () =>
      generateTechnicalRelationOutline(tenderId, {
        company_id: companyId === "" ? null : companyId,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["tenders", tenderId, "technical-relation"], updated);
      queryClient.invalidateQueries({
        queryKey: ["tenders", tenderId, "technical-relation", "versions"],
      });
      syncFromServer(updated.sections, updated.company_id ?? "");
      if (updated.sections.length > 0) {
        setActiveSectionId(updated.sections[0].id);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (version: number) => restoreTechnicalRelationVersion(tenderId, version),
    onSuccess: (updated) => {
      queryClient.setQueryData(["tenders", tenderId, "technical-relation"], updated);
      queryClient.invalidateQueries({
        queryKey: ["tenders", tenderId, "technical-relation", "versions"],
      });
      syncFromServer(updated.sections, updated.company_id ?? "");
      if (updated.sections.length > 0) {
        setActiveSectionId(updated.sections[0].id);
      }
    },
  });

  if (isLoading) {
    return <p className="tender-technical-offer-loading">Caricamento offerta tecnica...</p>;
  }

  if (isError || !relation) {
    return (
      <p className="tender-technical-offer-error">
        Impossibile caricare l&apos;offerta tecnica.
      </p>
    );
  }

  const orderedSections = sortSectionsByOrder(draftSections);
  const criteriaById = new Map(relation.outline.criteria.map((criterion) => [criterion.id, criterion]));
  const activeSection = orderedSections.find((section) => section.id === activeSectionId) ?? null;
  const activeCriterion = activeSection
    ? criteriaById.get(activeSection.criterion_id)
    : undefined;
  const { total, completed } = countCompletedSections(orderedSections);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pagePlan = relation.outline.page_plan;
  const warnings = validation?.warnings ?? [];
  const activeSectionWarnings = activeSection
    ? warningsForSection(warnings, activeSection.id)
    : [];
  const activeSectionSeverity = highestSeverity(activeSectionWarnings);

  function updateActiveSection(field: "content" | "completed", value: string | boolean) {
    if (!activeSectionId) return;
    setDraftSections((sections) =>
      sections.map((section) =>
        section.id === activeSectionId ? { ...section, [field]: value } : section,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDraftSections((sections) => reorderSections(sections, String(active.id), String(over.id)));
  }

  function scrollToSectionEditor(sectionId: string) {
    window.setTimeout(() => {
      layoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document
        .getElementById(`offer-section-${sectionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function handleNavigateToSection(sectionId: string) {
    setActiveSectionId(sectionId);
    scrollToSectionEditor(sectionId);
  }

  function renderSaveStatus() {
    switch (saveStatus) {
      case "pending":
        return <span className="tender-technical-offer-save-status tender-technical-offer-save-status--pending">Modifiche in sospeso...</span>;
      case "saving":
        return <span className="tender-technical-offer-save-status tender-technical-offer-save-status--saving">Salvataggio...</span>;
      case "saved":
        return <span className="tender-technical-offer-save-status tender-technical-offer-save-status--saved">Salvato</span>;
      case "error":
        return <span className="tender-technical-offer-save-status tender-technical-offer-save-status--error">Errore salvataggio</span>;
      default:
        return <span className="tender-technical-offer-save-status">Tutte le modifiche salvate</span>;
    }
  }

  return (
    <section className="tender-technical-offer">
      <div className="tender-technical-offer-card">
        <div className="tender-technical-offer-header">
          <div>
            <h3>Offerta tecnica</h3>
            <p>
              Componi la relazione tecnica sezione per sezione, con riordino drag &amp; drop e
              salvataggio automatico.
            </p>
          </div>
          <div className="tender-technical-offer-actions">
            {renderSaveStatus()}
            {versions.length > 0 && (
              <label className="tender-technical-offer-version">
                <span>Versione</span>
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value > 0) {
                      restoreMutation.mutate(value);
                      event.target.value = "";
                    }
                  }}
                  disabled={restoreMutation.isPending}
                >
                  <option value="">Ripristina...</option>
                  {versions.map((item) => (
                    <option key={item.id} value={item.version}>
                      v{item.version} – {item.change_note || item.created_at}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="tender-technical-offer-generate"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "Generazione..." : "Genera outline"}
            </button>
          </div>
        </div>

        <div className="tender-technical-offer-toolbar">
          <label className="tender-technical-offer-company">
            Azienda
            <select
              value={companyId}
              onChange={(event) => {
                const value = event.target.value;
                setCompanyId(value === "" ? "" : Number(value));
              }}
            >
              <option value="">Nessuna selezionata</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          {relation.generated_at && (
            <span className="tender-technical-offer-meta">
              Outline generato il{" "}
              {new Date(relation.generated_at).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {relation.outline.source_summary && (
                <> · {relation.outline.source_summary}</>
              )}
            </span>
          )}
        </div>

        {(generateMutation.isError || saveStatus === "error") && (
          <p className="tender-technical-offer-error-banner">
            Operazione non riuscita. Riprova.
          </p>
        )}

        {!hasOutline ? (
          <p className="tender-technical-offer-empty">
            Nessun outline disponibile. Carica i documenti di gara e premi
            &quot;Genera outline&quot; per creare criteri e piano pagine.
          </p>
        ) : (
          <>
            <div className="tender-technical-offer-progress">
              <div className="tender-technical-offer-progress-text">
                <strong>{completed}</strong> di <strong>{total}</strong> sezioni completate
                {total > 0 && (
                  <span className="tender-technical-offer-progress-pct">({progress}%)</span>
                )}
              </div>
              <div
                className="tender-technical-offer-progress-bar"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="tender-technical-offer-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="tender-technical-offer-page-plan">
              <h4>Piano pagine</h4>
              <div className="tender-technical-offer-page-plan-stats">
                {pagePlan.max_pages !== null && (
                  <span>Limite: <strong>{pagePlan.max_pages}</strong> pagine</span>
                )}
                <span>
                  Pianificate: <strong>{pagePlan.total_suggested_pages}</strong> pagine
                </span>
              </div>
              <ol className="tender-technical-offer-page-plan-list">
                {pagePlan.entries.map((entry) => (
                  <li key={entry.criterion_id}>
                    <span className="tender-technical-offer-page-plan-title">
                      {entry.title}
                    </span>
                    <span className="tender-technical-offer-page-plan-pages">
                      {entry.pages} {entry.pages === 1 ? "pagina" : "pagine"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <TechnicalOfferValidationReport
              validation={validation}
              isLoading={isValidating && validation === null}
              isRefreshing={isValidating && validation !== null}
              activeSectionId={activeSectionId}
              onSelectSection={handleNavigateToSection}
            />

            <div ref={layoutRef} className="tender-technical-offer-layout">
              <aside className="tender-technical-offer-structure">
                <div className="tender-technical-offer-structure-header">
                  <h4>Struttura documento</h4>
                  <p>Trascina per riordinare le sezioni</p>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedSections.map((section) => section.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="tender-technical-offer-sections-list">
                      {orderedSections.map((section, index) => {
                        const sectionWarnings = warningsForSection(warnings, section.id);
                        return (
                          <TechnicalOfferSectionItem
                            key={section.id}
                            section={section}
                            index={index}
                            criterion={criteriaById.get(section.criterion_id)}
                            isActive={section.id === activeSectionId}
                            warningSeverity={highestSeverity(sectionWarnings)}
                            warningCount={sectionWarnings.length}
                            onSelect={setActiveSectionId}
                          />
                        );
                      })}
                    </ul>
                  </SortableContext>
                </DndContext>
              </aside>

              <div className="tender-technical-offer-editor">
                {activeSection ? (
                  <>
                    <div className="tender-technical-offer-editor-header">
                      <div>
                        <h4>{activeSection.title}</h4>
                        {activeCriterion?.description && (
                          <p className="tender-technical-offer-criterion-description">
                            {activeCriterion.description}
                          </p>
                        )}
                      </div>
                      <label className="tender-technical-offer-completed">
                        <input
                          type="checkbox"
                          checked={activeSection.completed}
                          onChange={(event) =>
                            updateActiveSection("completed", event.target.checked)
                          }
                        />
                        Sezione completata
                      </label>
                    </div>

                    <div
                      className={`tender-technical-offer-editor-warnings-wrap${
                        activeSectionWarnings.length > 0
                          ? " tender-technical-offer-editor-warnings-wrap--open"
                          : ""
                      }`}
                    >
                      <ul className="tender-technical-offer-editor-warnings">
                        {activeSectionWarnings.map((warning) => (
                          <li
                            key={warning.id}
                            className={`tender-technical-offer-editor-warning tender-technical-offer-editor-warning--${warning.severity}`}
                          >
                            <strong>{VALIDATION_SEVERITY_LABELS[warning.severity]}:</strong>{" "}
                            {warning.message}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="tender-technical-offer-editor-workspace">
                      <div className="tender-technical-offer-editor-grid">
                        <div className="tender-technical-offer-editor-main">
                          <label htmlFor="section-content">Contenuto sezione</label>
                          <textarea
                            id="section-content"
                            className={`tender-technical-offer-textarea${
                              activeSectionSeverity
                                ? ` tender-technical-offer-textarea--warning-${activeSectionSeverity}`
                                : ""
                            }`}
                            value={activeSection.content}
                            onChange={(event) =>
                              updateActiveSection("content", event.target.value)
                            }
                            rows={16}
                            placeholder="Scrivi il contenuto per questo criterio..."
                          />
                        </div>
                        <div className="tender-technical-offer-editor-preview">
                          <p className="tender-technical-offer-preview-label">Anteprima</p>
                          <TechnicalOfferPreview
                            title={activeSection.title}
                            content={activeSection.content}
                            emptyMessage="L'anteprima apparirà qui mentre scrivi."
                          />
                        </div>
                      </div>

                      <TechnicalRelationAiAssistant
                        tenderId={tenderId}
                        companyId={companyId}
                        activeSection={activeSection}
                        activeCriterion={activeCriterion}
                        onApplyContent={(content) => updateActiveSection("content", content)}
                      />
                    </div>
                  </>
                ) : (
                  <p className="tender-technical-offer-editor-empty">
                    Seleziona una sezione dalla struttura documento per iniziare a scrivere.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
