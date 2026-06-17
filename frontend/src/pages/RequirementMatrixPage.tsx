import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RequirementMatrixTable } from "../components/RequirementMatrixTable";
import { fetchTenders } from "../api/tenders";
import "./RequirementMatrixPage.css";

export function RequirementMatrixPage() {
  const { tenderId: tenderIdParam } = useParams<{ tenderId?: string }>();
  const navigate = useNavigate();

  const selectedTenderId = tenderIdParam ? Number(tenderIdParam) : null;

  const { data: tenders = [], isLoading: tendersLoading } = useQuery({
    queryKey: ["tenders", "matrix-picker"],
    queryFn: () => fetchTenders(),
  });

  const selectedTender = useMemo(
    () => tenders.find((tender) => tender.id === selectedTenderId),
    [tenders, selectedTenderId],
  );

  function handleTenderChange(tenderId: string) {
    if (!tenderId) {
      navigate("/requirements-matrix");
      return;
    }
    navigate(`/requirements-matrix/${tenderId}`);
  }

  return (
    <div className="requirement-matrix-page">
      <header className="requirement-matrix-page-header">
        <div>
          <Link to="/tenders" className="requirement-matrix-back">
            ← Gare
          </Link>
          <h2>Matrice Requisiti</h2>
          <p>
            Confronto requisiti gara × aziende: verde = soddisfatto, giallo = parziale, rosso = non
            soddisfatto.
          </p>
        </div>

        <label className="requirement-matrix-tender-select">
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

      <section className="requirement-matrix-card">
        {!selectedTenderId || Number.isNaN(selectedTenderId) ? (
          <p className="requirement-matrix-status">
            Seleziona una gara per visualizzare la matrice di confronto requisiti/aziende.
          </p>
        ) : (
          <>
            {selectedTender && (
              <p className="requirement-matrix-tender-meta">
                Gara <strong>{selectedTender.cig}</strong>
                {selectedTender.oggetto ? ` · ${selectedTender.oggetto}` : ""}
                {" · "}
                <Link to={`/tenders/${selectedTender.id}`}>Apri dettaglio gara</Link>
              </p>
            )}
            <RequirementMatrixTable tenderId={selectedTenderId} />
          </>
        )}
      </section>
    </div>
  );
}
