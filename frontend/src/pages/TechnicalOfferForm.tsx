import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTechnicalOffer,
  fetchTechnicalOffer,
  updateTechnicalOffer,
} from "../api/technicalOffers";
import { TechnicalOfferPreview } from "../components/TechnicalOfferPreview";
import type {
  TechnicalOfferCategory,
  TechnicalOfferPayload,
  TechnicalOfferSettore,
} from "../types/technicalOffer";
import {
  RATING_OPTIONS,
  TECHNICAL_OFFER_CATEGORIES,
  TECHNICAL_OFFER_SETTORI,
} from "../types/technicalOffer";
import { fieldValidation, validateForm } from "../utils/formValidation";
import "./TechnicalOfferForm.css";

interface TechnicalOfferFormState {
  title: string;
  category: TechnicalOfferCategory;
  settore: TechnicalOfferSettore;
  tipologia_servizio: string;
  ente_appaltante: string;
  valore_appalto: string;
  durata: string;
  anno: string;
  punteggio_ottenuto: string;
  content: string;
  tags: string;
  parole_chiave: string;
  riutilizzabilita: number;
  innovativita: number;
}

const EMPTY_FORM: TechnicalOfferFormState = {
  title: "",
  category: "organizzazione",
  settore: "",
  tipologia_servizio: "",
  ente_appaltante: "",
  valore_appalto: "",
  durata: "",
  anno: "",
  punteggio_ottenuto: "",
  content: "",
  tags: "",
  parole_chiave: "",
  riutilizzabilita: 3,
  innovativita: 3,
};

function listToText(items: string[]): string {
  return items.join(", ");
}

function textToList(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function TechnicalOfferFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const offerId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<TechnicalOfferFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["technical-offers", offerId],
    queryFn: () => fetchTechnicalOffer(offerId!),
    enabled: isEdit && offerId !== null && !Number.isNaN(offerId),
  });

  useEffect(() => {
    if (offer) {
      setForm({
        title: offer.title,
        category: offer.category,
        settore: offer.settore,
        tipologia_servizio: offer.tipologia_servizio,
        ente_appaltante: offer.ente_appaltante,
        valore_appalto: offer.valore_appalto ?? "",
        durata: offer.durata,
        anno: offer.anno ? String(offer.anno) : "",
        punteggio_ottenuto: offer.punteggio_ottenuto ?? "",
        content: offer.content,
        tags: listToText(offer.tags),
        parole_chiave: listToText(offer.parole_chiave),
        riutilizzabilita: offer.riutilizzabilita,
        innovativita: offer.innovativita,
      });
    }
  }, [offer]);

  const mutation = useMutation({
    mutationFn: (payload: TechnicalOfferPayload) =>
      isEdit && offerId
        ? updateTechnicalOffer(offerId, payload)
        : createTechnicalOffer(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["technical-offers"] });
      navigate(`/technical-offers/${saved.id}`);
    },
    onError: () => {
      setError("Salvataggio non riuscito. Verifica i dati inseriti.");
    },
  });

  function updateField<K extends keyof TechnicalOfferFormState>(
    field: K,
    value: TechnicalOfferFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function buildPayload(): TechnicalOfferPayload {
    return {
      title: form.title.trim(),
      category: form.category,
      settore: form.settore || undefined,
      tipologia_servizio: form.tipologia_servizio.trim(),
      ente_appaltante: form.ente_appaltante.trim(),
      valore_appalto: form.valore_appalto.trim() || null,
      durata: form.durata.trim(),
      anno: form.anno ? Number(form.anno) : null,
      punteggio_ottenuto: form.punteggio_ottenuto.trim() || null,
      content: form.content,
      tags: textToList(form.tags),
      parole_chiave: textToList(form.parole_chiave),
      riutilizzabilita: form.riutilizzabilita,
      innovativita: form.innovativita,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      return;
    }
    setError(null);
    mutation.mutate(buildPayload());
  }

  if (isEdit && isLoading) {
    return <p className="technical-offer-form-loading">Caricamento...</p>;
  }

  return (
    <div className="technical-offer-form-page">
      <header className="technical-offer-form-header">
        <h2>{isEdit ? "Modifica contenuto" : "Nuovo contenuto"}</h2>
        <p>
          Compila i metadati per la libreria e l&apos;indicizzazione RAG. Il testo consolidato
          viene generato automaticamente al salvataggio.
        </p>
      </header>

      <div className="technical-offer-form-layout">
        <form className="technical-offer-form-card" onSubmit={handleSubmit} noValidate>
          <fieldset className="technical-offer-form-section">
            <legend>Identificazione</legend>

            <label htmlFor="title">Titolo</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Es. Organizzazione servizio di pulizia ospedaliera"
              required
              {...fieldValidation({
                required: "Dai un titolo a questo contenuto riutilizzabile",
              })}
            />

            <label htmlFor="category">Categoria</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) =>
                updateField("category", e.target.value as TechnicalOfferCategory)
              }
            >
              {TECHNICAL_OFFER_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <label htmlFor="settore">Settore</label>
            <select
              id="settore"
              value={form.settore}
              onChange={(e) =>
                updateField("settore", e.target.value as TechnicalOfferSettore)
              }
            >
              {TECHNICAL_OFFER_SETTORI.map((s) => (
                <option key={s.value || "none"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <label htmlFor="tipologia_servizio">Tipologia servizio</label>
            <input
              id="tipologia_servizio"
              type="text"
              value={form.tipologia_servizio}
              onChange={(e) => updateField("tipologia_servizio", e.target.value)}
              placeholder="Es. Pulizia ordinaria e straordinaria"
            />
          </fieldset>

          <fieldset className="technical-offer-form-section">
            <legend>Contesto gara</legend>

            <label htmlFor="ente_appaltante">Ente appaltante</label>
            <input
              id="ente_appaltante"
              type="text"
              value={form.ente_appaltante}
              onChange={(e) => updateField("ente_appaltante", e.target.value)}
              placeholder="Es. Comune di Milano"
            />

            <div className="technical-offer-form-row">
              <div>
                <label htmlFor="valore_appalto">Valore appalto (€)</label>
                <input
                  id="valore_appalto"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.valore_appalto}
                  onChange={(e) => updateField("valore_appalto", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="durata">Durata</label>
                <input
                  id="durata"
                  type="text"
                  value={form.durata}
                  onChange={(e) => updateField("durata", e.target.value)}
                  placeholder="Es. 36 mesi"
                />
              </div>
            </div>

            <div className="technical-offer-form-row">
              <div>
                <label htmlFor="anno">Anno</label>
                <input
                  id="anno"
                  type="number"
                  min={1990}
                  max={2100}
                  value={form.anno}
                  onChange={(e) => updateField("anno", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="punteggio_ottenuto">Punteggio ottenuto</label>
                <input
                  id="punteggio_ottenuto"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.punteggio_ottenuto}
                  onChange={(e) => updateField("punteggio_ottenuto", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="technical-offer-form-section">
            <legend>Ricerca e RAG</legend>

            <label htmlFor="parole_chiave">Parole chiave</label>
            <input
              id="parole_chiave"
              type="text"
              value={form.parole_chiave}
              onChange={(e) => updateField("parole_chiave", e.target.value)}
              placeholder="Es. pulizie, sanificazione, HACCP"
            />
            <p className="technical-offer-form-hint">Separate da virgola. Usate per ricerca e RAG.</p>

            <label htmlFor="tags">Tag</label>
            <input
              id="tags"
              type="text"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="Es. template, referenza"
            />

            <div className="technical-offer-form-row">
              <div>
                <label htmlFor="riutilizzabilita">Riutilizzabilità (1-5)</label>
                <select
                  id="riutilizzabilita"
                  value={form.riutilizzabilita}
                  onChange={(e) => updateField("riutilizzabilita", Number(e.target.value))}
                >
                  {RATING_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="innovativita">Innovatività (1-5)</label>
                <select
                  id="innovativita"
                  value={form.innovativita}
                  onChange={(e) => updateField("innovativita", Number(e.target.value))}
                >
                  {RATING_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="content">Contenuto</label>
            <textarea
              id="content"
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              placeholder="Inserisci il testo riutilizzabile per l'offerta tecnica..."
              rows={12}
            />
          </fieldset>

          {error && <p className="technical-offer-form-error">{error}</p>}

          <div className="technical-offer-form-actions">
            <Link
              to={
                isEdit && offerId ? `/technical-offers/${offerId}` : "/technical-offers"
              }
            >
              Annulla
            </Link>
            <button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Salvataggio..."
                : isEdit
                  ? "Salva modifiche"
                  : "Crea contenuto"}
            </button>
          </div>
        </form>

        <aside className="technical-offer-form-preview">
          <h3>Anteprima</h3>
          <TechnicalOfferPreview
            title={form.title.trim() || "Titolo contenuto"}
            content={form.content}
            emptyMessage="Il contenuto apparirà qui mentre scrivi."
          />
        </aside>
      </div>
    </div>
  );
}
