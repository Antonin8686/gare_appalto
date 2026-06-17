import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchParticipationSuggestion } from "../api/participation";
import { fetchTenders } from "../api/tenders";
import { ParticipationAnalysisPanel } from "../components/ParticipationAnalysisPanel";
import { RtiWizard } from "../components/RtiWizard";
import type { ParticipationAnalysis } from "../types/participation";
import "./ParticipationPage.css";

export function ParticipationPage() {
  const { tenderId: tenderIdParam } = useParams<{ tenderId?: string }>();
  const navigate = useNavigate();
  const selectedTenderId = tenderIdParam ? Number(tenderIdParam) : null;

  const [liveAnalysis, setLiveAnalysis] = useState<ParticipationAnalysis | null>(null);

  const { data: tenders = [], isLoading: tendersLoading } = useQuery({
    queryKey: ["tenders", "participation-picker"],
    queryFn: () => fetchTenders(),
  });

  const { data: suggestionData, isLoading: suggestionLoading } = useQuery({
    queryKey: ["tenders", selectedTenderId, "participation-suggestion"],
    queryFn: () => fetchParticipationSuggestion(selectedTenderId!),
    enabled: selectedTenderId !== null && !Number.isNaN(selectedTenderId),
  });

  const selectedTender = tenders.find((tender) => tender.id === selectedTenderId);
  const analysis = liveAnalysis ?? suggestionData?.analisi ?? null;

  function handleTenderChange(tenderId: string) {
    if (!tenderId) {
      navigate("/participation");
      return;
    }
    navigate(`/participation/${tenderId}`);
  }

  return (
    <div className="participation-page">
      <header className="participation-page-header">
        <div>
          <Link to="/tenders" className="participation-page-back">
            ← Gare
          </Link>
          <h2>Forme di Partecipazione</h2>
          <p>
            Componi RTI, consorzi o avvalimenti e verifica la copertura dei requisiti con
            suggerimento automatico.
          </p>
        </div>

        <label className="participation-tender-select">
          <span>Gara</span>
          <select
            value={selectedTenderId ?? ""}
            onChange={(e) => handleTenderChange(e.target.value)}
            disabled={tendersLoading}
          >
            <option value="">Seleziona una gara...</option>
            {tenders.map((tender) => (
              <option key={tender.id} value={tender.id}>
                {tender.cig} — {tender.oggetto?.slice(0, 60) || "Senza oggetto"}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!selectedTenderId || Number.isNaN(selectedTenderId) ? (
        <section className="participation-page-card">
          <p className="participation-page-empty">
            Seleziona una gara per configurare le forme di partecipazione.
          </p>
        </section>
      ) : (
        <>
          {selectedTender && (
            <p className="participation-page-meta">
              Gara <strong>{selectedTender.cig}</strong>
              {selectedTender.oggetto ? ` · ${selectedTender.oggetto}` : ""}
              {" · "}
              <Link to={`/tenders/${selectedTender.id}`}>Dettaglio gara</Link>
              {" · "}
              <Link to={`/requirements-matrix/${selectedTender.id}`}>Matrice requisiti</Link>
            </p>
          )}

          <div className="participation-page-grid">
            <section className="participation-page-card">
              <h3>Wizard composizione RTI</h3>
              <RtiWizard
                tenderId={selectedTenderId}
                suggestion={suggestionData?.suggerimento}
                onAnalysisChange={setLiveAnalysis}
              />
            </section>

            <section className="participation-page-card participation-page-card--analysis">
              <h3>Analisi e suggerimento</h3>
              <ParticipationAnalysisPanel
                suggestion={suggestionData?.suggerimento}
                analysis={analysis}
                isLoading={suggestionLoading && !liveAnalysis}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
