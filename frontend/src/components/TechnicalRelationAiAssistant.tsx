import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAiConfig, generateAiContent } from "../api/ai";
import type { AiActionType } from "../types/ai";
import { AI_ACTION_DESCRIPTIONS, AI_ACTION_LABELS } from "../types/ai";
import type { TechnicalRelationCriterion, TechnicalRelationSection } from "../types/tenderTechnicalRelation";
import { RagSourcesPanel } from "./RagSourcesPanel";
import { TechnicalOfferPreview } from "./TechnicalOfferPreview";
import "./TechnicalRelationAiAssistant.css";

const SECTION_ACTIONS: AiActionType[] = [
  "technical_criterion",
  "improvement_proposal",
  "content_adaptation",
];

interface TechnicalRelationAiAssistantProps {
  tenderId: number;
  companyId: number | "";
  activeSection: TechnicalRelationSection | null;
  activeCriterion: TechnicalRelationCriterion | undefined;
  onApplyContent: (content: string) => void;
}

export function TechnicalRelationAiAssistant({
  tenderId,
  companyId,
  activeSection,
  activeCriterion,
  onApplyContent,
}: TechnicalRelationAiAssistantProps) {
  const [selectedAction, setSelectedAction] = useState<AiActionType>("technical_criterion");
  const [instructions, setInstructions] = useState("");
  const [lastResult, setLastResult] = useState<Awaited<ReturnType<typeof generateAiContent>> | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["ai", "config"],
    queryFn: fetchAiConfig,
  });

  const generateMutation = useMutation({
    mutationFn: generateAiContent,
    onSuccess: (result) => {
      setLastResult(result);
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      setLastResult(null);
      const detail =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
          "string"
          ? (error as { response: { data: { detail: string } } }).response.data.detail
          : "Errore durante la generazione AI.";
      setErrorMessage(detail);
    },
  });

  function handleGenerate(action: AiActionType) {
    setSelectedAction(action);
    setErrorMessage(null);

    const needsSection =
      action !== "report_structure" && SECTION_ACTIONS.includes(action);
    if (needsSection && !activeSection) {
      setErrorMessage("Seleziona una sezione prima di generare.");
      return;
    }

    generateMutation.mutate({
      action,
      tender_id: tenderId,
      company_id: companyId === "" ? null : companyId,
      section_id: activeSection?.id,
      section_title: activeSection?.title,
      section_content: activeSection?.content,
      criterion_description: activeCriterion?.description,
      instructions: instructions.trim() || undefined,
    });
  }

  const sources = lastResult?.sources ?? [];
  const canApply = Boolean(lastResult?.content && sources.length > 0);

  return (
    <aside className="technical-relation-ai">
      <div className="technical-relation-ai__header">
        <div>
          <h4>Assistente AI</h4>
          <p>
            {config?.configured
              ? `${config.provider} · ${config.model}`
              : "Provider LLM non configurato"}
          </p>
        </div>
      </div>

      {!config?.configured && (
        <p className="technical-relation-ai__notice">
          Configura <code>OPENAI_API_KEY</code> o Azure OpenAI nel file <code>.env</code> del backend.
        </p>
      )}

      <label className="technical-relation-ai__field">
        Istruzioni aggiuntive
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={3}
          placeholder="Es. enfatizza certificazioni ISO, massimo 2 pagine..."
        />
      </label>

      <div className="technical-relation-ai__actions">
        {SECTION_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className={`technical-relation-ai__action${
              selectedAction === action ? " technical-relation-ai__action--active" : ""
            }`}
            disabled={!config?.configured || generateMutation.isPending || !activeSection}
            onClick={() => handleGenerate(action)}
            title={AI_ACTION_DESCRIPTIONS[action]}
          >
            {generateMutation.isPending && selectedAction === action
              ? "Generazione..."
              : AI_ACTION_LABELS[action]}
          </button>
        ))}
        <button
          type="button"
          className={`technical-relation-ai__action technical-relation-ai__action--structure${
            selectedAction === "report_structure" ? " technical-relation-ai__action--active" : ""
          }`}
          disabled={!config?.configured || generateMutation.isPending}
          onClick={() => handleGenerate("report_structure")}
          title={AI_ACTION_DESCRIPTIONS.report_structure}
        >
          {generateMutation.isPending && selectedAction === "report_structure"
            ? "Generazione..."
            : AI_ACTION_LABELS.report_structure}
        </button>
      </div>

      {errorMessage && <p className="technical-relation-ai__error">{errorMessage}</p>}

      {lastResult && (
        <div className="technical-relation-ai__result">
          <div className="technical-relation-ai__result-meta">
            <span>Modello: {lastResult.model}</span>
            <span>{new Date(lastResult.created_at).toLocaleString("it-IT")}</span>
          </div>

          {sources.length > 0 ? (
            <RagSourcesPanel
              sources={sources}
              compact
              title="Fonti RAG utilizzate (obbligatorie)"
            />
          ) : (
            <p className="technical-relation-ai__error">
              Nessuna fonte recuperata: la generazione non può essere applicata.
            </p>
          )}

          <TechnicalOfferPreview
            title="Risultato AI"
            content={lastResult.content}
            emptyMessage=""
          />

          {activeSection && (
            <button
              type="button"
              className="technical-relation-ai__apply"
              disabled={!canApply}
              onClick={() => onApplyContent(lastResult.content)}
            >
              Applica al contenuto sezione
            </button>
          )}
        </div>
      )}

      <p className="technical-relation-ai__policy">
        Ogni generazione salva prompt, modello, timestamp e fonti RAG. Non è possibile applicare
        contenuti senza fonti citate.
      </p>
    </aside>
  );
}
