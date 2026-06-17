import { useQuery } from "@tanstack/react-query";
import { fetchTenderRequirement } from "../api/tenderRequirements";
import {
  REQUIREMENT_CATEGORIA_LABELS,
  REQUIREMENT_TIPO_LABELS,
  requirementTipologiaLabel,
  type TenderRequirement,
} from "../types/tenderRequirement";
import "./TenderRequirementDetail.css";

interface TenderRequirementDetailProps {
  tenderId: number;
  requirementId: number | null;
  fallback?: TenderRequirement | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function boolLabel(value: boolean, yes = "Sì", no = "No"): string {
  return value ? yes : no;
}

export function TenderRequirementDetail({
  tenderId,
  requirementId,
  fallback,
  onClose,
}: TenderRequirementDetailProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenders", tenderId, "requirements", requirementId],
    queryFn: () => fetchTenderRequirement(tenderId, requirementId!),
    enabled: requirementId !== null,
  });

  const requirement = data ?? fallback;

  if (requirementId === null) {
    return null;
  }

  return (
    <aside className="requirement-detail-panel" aria-labelledby="requirement-detail-title">
      <header className="requirement-detail-header">
        <div>
          <p className="requirement-detail-eyebrow">Dettaglio requisito</p>
          <h3 id="requirement-detail-title">
            {isLoading && !requirement ? "Caricamento..." : requirement?.descrizione.slice(0, 120)}
          </h3>
        </div>
        <button type="button" className="requirement-detail-close" onClick={onClose}>
          Chiudi
        </button>
      </header>

        {isError && !requirement && (
          <p className="requirement-detail-error">Impossibile caricare il dettaglio del requisito.</p>
        )}

        {requirement && (
          <div className="requirement-detail-body">
            <section className="requirement-detail-section">
              <h4>Tipologia</h4>
              <div className="requirement-detail-badges">
                <span className={`requirement-detail-badge requirement-detail-badge--tipo-${requirement.tipo}`}>
                  {REQUIREMENT_TIPO_LABELS[requirement.tipo]}
                </span>
                <span className="requirement-detail-badge requirement-detail-badge--categoria">
                  {REQUIREMENT_CATEGORIA_LABELS[requirement.categoria]}
                </span>
                <span className="requirement-detail-badge requirement-detail-badge--tipologia">
                  {requirementTipologiaLabel(requirement)}
                </span>
              </div>
              <p className="requirement-detail-description">{requirement.descrizione}</p>
            </section>

            <section className="requirement-detail-section">
              <h4>Origine</h4>
              <dl className="requirement-detail-fields">
                <div>
                  <dt>Documento</dt>
                  <dd>{requirement.documento_origine || requirement.document_name || "—"}</dd>
                </div>
                <div>
                  <dt>Pagina</dt>
                  <dd>{requirement.pagina_origine || "—"}</dd>
                </div>
                <div>
                  <dt>Paragrafo</dt>
                  <dd>{requirement.paragrafo_origine || "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="requirement-detail-section">
              <h4>Regole di partecipazione</h4>
              <dl className="requirement-detail-fields requirement-detail-fields--grid">
                <div>
                  <dt>Soggetto obbligato</dt>
                  <dd>{requirement.soggetto_obbligato || "—"}</dd>
                </div>
                <div>
                  <dt>Soglia minima</dt>
                  <dd>{requirement.soglia_minima || requirement.soglia || "—"}</dd>
                </div>
                <div>
                  <dt>Modalità di comprova</dt>
                  <dd>{requirement.modalita_comprova || "—"}</dd>
                </div>
                <div>
                  <dt>Avvalimento consentito</dt>
                  <dd>{boolLabel(requirement.avvalimento_consentito)}</dd>
                </div>
                <div>
                  <dt>RTI consentito</dt>
                  <dd>{boolLabel(requirement.rti_consentito)}</dd>
                </div>
                <div>
                  <dt>Consorzio consentito</dt>
                  <dd>{boolLabel(requirement.consorzio_consentito)}</dd>
                </div>
              </dl>
            </section>

            {requirement.note_interpretative && (
              <section className="requirement-detail-section">
                <h4>Note interpretative</h4>
                <p className="requirement-detail-notes">{requirement.note_interpretative}</p>
              </section>
            )}

            <section className="requirement-detail-section requirement-detail-meta">
              <dl className="requirement-detail-fields">
                <div>
                  <dt>Estratto il</dt>
                  <dd>{formatDate(requirement.created_at)}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
    </aside>
  );
}
