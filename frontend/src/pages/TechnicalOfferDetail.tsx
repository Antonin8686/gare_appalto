import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteTechnicalOffer, fetchTechnicalOffer } from "../api/technicalOffers";
import { TechnicalOfferMetaPanel } from "../components/TechnicalOfferMetaPanel";
import { TechnicalOfferPreview } from "../components/TechnicalOfferPreview";
import "./TechnicalOfferDetail.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TechnicalOfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const offerId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: offer, isLoading, isError, error } = useQuery({
    queryKey: ["technical-offers", offerId],
    queryFn: () => fetchTechnicalOffer(offerId!),
    enabled: offerId !== null && !Number.isNaN(offerId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTechnicalOffer(offerId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-offers"] });
      navigate("/technical-offers");
    },
  });

  function handleDelete() {
    if (window.confirm("Sei sicuro di voler eliminare questo contenuto?")) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return <p className="technical-offer-detail-loading">Caricamento...</p>;
  }

  if (isError || !offer) {
    return (
      <p className="technical-offer-detail-error">
        Errore: {error instanceof Error ? error.message : "contenuto non trovato"}
      </p>
    );
  }

  return (
    <div className="technical-offer-detail">
      <header className="technical-offer-detail-header">
        <div>
          <Link to="/technical-offers" className="technical-offer-detail-back">
            ← Torna alla libreria
          </Link>
          <h2>{offer.title}</h2>
          <p>{offer.category_display}</p>
        </div>
        <div className="technical-offer-detail-actions">
          <Link
            to={`/technical-offers/${offer.id}/edit`}
            className="technical-offer-detail-edit"
          >
            Modifica
          </Link>
          <button
            type="button"
            className="technical-offer-detail-delete"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
          </button>
        </div>
      </header>

      <section className="technical-offer-detail-card">
        <h3 className="technical-offer-detail-section-title">Metadati</h3>
        <TechnicalOfferMetaPanel offer={offer} />
      </section>

      <section className="technical-offer-detail-card">
        <h3 className="technical-offer-detail-section-title">Anteprima contenuto</h3>
        <TechnicalOfferPreview content={offer.content} />
      </section>

      {offer.rag_text && (
        <section className="technical-offer-detail-card technical-offer-detail-rag">
          <h3 className="technical-offer-detail-section-title">Indice RAG</h3>
          <p className="technical-offer-detail-rag-note">
            Testo consolidato generato automaticamente per il futuro modulo di retrieval.
          </p>
          <pre className="technical-offer-detail-rag-text">{offer.rag_text}</pre>
        </section>
      )}

      <section className="technical-offer-detail-card technical-offer-detail-meta">
        <dl className="technical-offer-detail-fields">
          <div>
            <dt>Creato il</dt>
            <dd>{formatDate(offer.created_at)}</dd>
          </div>
          <div>
            <dt>Ultimo aggiornamento</dt>
            <dd>{formatDate(offer.updated_at)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
