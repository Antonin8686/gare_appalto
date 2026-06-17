import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  fetchTechnicalOfferFacets,
  fetchTechnicalOffers,
} from "../api/technicalOffers";
import { TechnicalOfferMetaPanel } from "../components/TechnicalOfferMetaPanel";
import { TechnicalOfferPreview } from "../components/TechnicalOfferPreview";
import {
  TECHNICAL_OFFER_CATEGORIES,
  TECHNICAL_OFFER_SETTORI,
  RATING_OPTIONS,
  categoryLabel,
  formatPunteggio,
  formatValoreAppalto,
  groupOffersByCategory,
  settoreLabel,
  type TechnicalOffer,
  type TechnicalOfferCategory,
  type TechnicalOfferFilters,
  type TechnicalOfferSettore,
} from "../types/technicalOffer";
import "./TechnicalOffersList.css";

type ViewMode = "table" | "categorized";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OfferRow({
  item,
  previewId,
  onPreview,
}: {
  item: TechnicalOffer;
  previewId: number | null;
  onPreview: (id: number) => void;
}) {
  return (
    <tr className={previewId === item.id ? "technical-offers-row--active" : ""}>
      <td>
        <Link to={`/technical-offers/${item.id}`} className="technical-offers-link">
          {item.title}
        </Link>
        {item.ente_appaltante && (
          <span className="technical-offers-subtitle">{item.ente_appaltante}</span>
        )}
      </td>
      <td>{item.category_display}</td>
      <td>{item.settore ? settoreLabel(item.settore) : "—"}</td>
      <td>{item.anno ?? "—"}</td>
      <td>{formatPunteggio(item.punteggio_ottenuto)}</td>
      <td>
        <span className="technical-offers-rating" title="Riutilizzabilità">
          R {item.riutilizzabilita}
        </span>
        <span className="technical-offers-rating" title="Innovatività">
          I {item.innovativita}
        </span>
      </td>
      <td>{formatDate(item.updated_at)}</td>
      <td className="technical-offers-actions">
        <button
          type="button"
          className="technical-offers-preview-btn"
          onClick={() => onPreview(item.id)}
        >
          {previewId === item.id ? "Chiudi" : "Anteprima"}
        </button>
        <Link to={`/technical-offers/${item.id}/edit`} className="technical-offers-edit-link">
          Modifica
        </Link>
      </td>
    </tr>
  );
}

export function TechnicalOffersListPage() {
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("categorized");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TechnicalOfferCategory | "">("");
  const [settoreFilter, setSettoreFilter] = useState<TechnicalOfferSettore>("");
  const [annoFilter, setAnnoFilter] = useState<number | "">("");
  const [riutilizzabilitaFilter, setRiutilizzabilitaFilter] = useState<number | "">("");
  const [innovativitaFilter, setInnovativitaFilter] = useState<number | "">("");

  const filters = useMemo<TechnicalOfferFilters>(
    () => ({
      q: searchQuery,
      category: categoryFilter,
      settore: settoreFilter || undefined,
      anno: annoFilter,
      riutilizzabilita: riutilizzabilitaFilter,
      innovativita: innovativitaFilter,
    }),
    [
      searchQuery,
      categoryFilter,
      settoreFilter,
      annoFilter,
      riutilizzabilitaFilter,
      innovativitaFilter,
    ],
  );

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["technical-offers", filters],
    queryFn: () => fetchTechnicalOffers(filters),
  });

  const { data: facets } = useQuery({
    queryKey: ["technical-offers", "facets", filters],
    queryFn: () => fetchTechnicalOfferFacets(filters),
  });

  const previewItem = data.find((item) => item.id === previewId) ?? null;
  const grouped = useMemo(() => groupOffersByCategory(data), [data]);

  const annoOptions = useMemo(() => {
    if (!facets?.anni) return [];
    return Object.keys(facets.anni)
      .map(Number)
      .sort((a, b) => b - a);
  }, [facets]);

  function togglePreview(id: number) {
    setPreviewId((current) => (current === id ? null : id));
  }

  function resetFilters() {
    setSearchQuery("");
    setCategoryFilter("");
    setSettoreFilter("");
    setAnnoFilter("");
    setRiutilizzabilitaFilter("");
    setInnovativitaFilter("");
  }

  const hasActiveFilters =
    searchQuery ||
    categoryFilter ||
    settoreFilter ||
    annoFilter ||
    riutilizzabilitaFilter ||
    innovativitaFilter;

  return (
    <div className="technical-offers">
      <header className="technical-offers-header">
        <div>
          <h2>Libreria Offerte Tecniche</h2>
          <p>
            Archivio strutturato di contenuti riutilizzabili, indicizzati per ricerca e futuro
            modulo RAG.
          </p>
        </div>
        <Link to="/technical-offers/new" className="technical-offers-new-btn">
          Nuovo contenuto
        </Link>
      </header>

      <div className="technical-offers-toolbar">
        <label className="technical-offers-search">
          <span className="sr-only">Cerca</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca titolo, contenuto, ente, parole chiave..."
          />
        </label>

        <div className="technical-offers-view-toggle">
          <button
            type="button"
            className={viewMode === "categorized" ? "technical-offers-view-btn--active" : ""}
            onClick={() => setViewMode("categorized")}
          >
            Per categoria
          </button>
          <button
            type="button"
            className={viewMode === "table" ? "technical-offers-view-btn--active" : ""}
            onClick={() => setViewMode("table")}
          >
            Tabella
          </button>
        </div>
      </div>

      <div className="technical-offers-layout">
        <aside className="technical-offers-filters">
          <div className="technical-offers-filters-header">
            <h3>Filtri</h3>
            {hasActiveFilters && (
              <button type="button" className="technical-offers-reset" onClick={resetFilters}>
                Azzera
              </button>
            )}
          </div>

          <label className="technical-offers-filter">
            <span>Categoria</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as TechnicalOfferCategory | "")}
            >
              <option value="">Tutte</option>
              {TECHNICAL_OFFER_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                  {facets?.category[cat.value] ? ` (${facets.category[cat.value]})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="technical-offers-filter">
            <span>Settore</span>
            <select
              value={settoreFilter}
              onChange={(e) => setSettoreFilter(e.target.value as TechnicalOfferSettore)}
            >
              {TECHNICAL_OFFER_SETTORI.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                  {s.value && facets?.settore[s.value] ? ` (${facets.settore[s.value]})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="technical-offers-filter">
            <span>Anno</span>
            <select
              value={annoFilter}
              onChange={(e) => setAnnoFilter(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Tutti</option>
              {annoOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                  {facets?.anni[String(year)] ? ` (${facets.anni[String(year)]})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="technical-offers-filter">
            <span>Riutilizzabilità min.</span>
            <select
              value={riutilizzabilitaFilter}
              onChange={(e) =>
                setRiutilizzabilitaFilter(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Qualsiasi</option>
              {RATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>

          <label className="technical-offers-filter">
            <span>Innovatività min.</span>
            <select
              value={innovativitaFilter}
              onChange={(e) =>
                setInnovativitaFilter(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Qualsiasi</option>
              {RATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>

          <p className="technical-offers-count">
            <strong>{data.length}</strong> contenut{data.length === 1 ? "o" : "i"}
          </p>
        </aside>

        <div className="technical-offers-main">
          {isLoading && <p className="technical-offers-loading">Caricamento...</p>}

          {isError && (
            <p className="technical-offers-error">
              Errore:{" "}
              {error instanceof Error ? error.message : "impossibile caricare i contenuti"}
            </p>
          )}

          {!isLoading && data.length === 0 && (
            <section className="technical-offers-empty">
              <p>Nessun contenuto corrisponde ai criteri selezionati.</p>
              <Link to="/technical-offers/new">Crea un nuovo contenuto</Link>
            </section>
          )}

          {data.length > 0 && viewMode === "table" && (
            <section className="technical-offers-table-card">
              <table className="technical-offers-table">
                <thead>
                  <tr>
                    <th>Titolo</th>
                    <th>Categoria</th>
                    <th>Settore</th>
                    <th>Anno</th>
                    <th>Punteggio</th>
                    <th>Rating</th>
                    <th>Aggiornato</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <OfferRow
                      key={item.id}
                      item={item}
                      previewId={previewId}
                      onPreview={togglePreview}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {data.length > 0 && viewMode === "categorized" && (
            <div className="technical-offers-categories">
              {grouped.map((group) => (
                <section key={group.category} className="technical-offers-category-block">
                  <header className="technical-offers-category-header">
                    <h3>{group.label}</h3>
                    <span>{group.items.length}</span>
                  </header>
                  <div className="technical-offers-cards">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        className={`technical-offers-card${previewId === item.id ? " technical-offers-card--active" : ""}`}
                      >
                        <div className="technical-offers-card-top">
                          <Link to={`/technical-offers/${item.id}`} className="technical-offers-card-title">
                            {item.title}
                          </Link>
                          {item.settore && (
                            <span className="technical-offers-card-settore">
                              {settoreLabel(item.settore)}
                            </span>
                          )}
                        </div>
                        {item.ente_appaltante && (
                          <p className="technical-offers-card-ente">{item.ente_appaltante}</p>
                        )}
                        <div className="technical-offers-card-meta">
                          {item.anno && <span>{item.anno}</span>}
                          {item.valore_appalto && (
                            <span>{formatValoreAppalto(item.valore_appalto)}</span>
                          )}
                          {item.punteggio_ottenuto && (
                            <span>Pt. {formatPunteggio(item.punteggio_ottenuto)}</span>
                          )}
                        </div>
                        {(item.parole_chiave.length > 0 || item.tags.length > 0) && (
                          <div className="technical-offers-card-tags">
                            {[...item.parole_chiave, ...item.tags].slice(0, 4).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="technical-offers-card-actions">
                          <button
                            type="button"
                            onClick={() => togglePreview(item.id)}
                          >
                            Anteprima
                          </button>
                          <Link to={`/technical-offers/${item.id}/edit`}>Modifica</Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="technical-offers-preview-panel">
          <h3>Anteprima</h3>
          {previewItem ? (
            <>
              <p className="technical-offers-preview-category">
                {categoryLabel(previewItem.category)}
              </p>
              <TechnicalOfferMetaPanel offer={previewItem} />
              <TechnicalOfferPreview
                title={previewItem.title}
                content={previewItem.content}
              />
            </>
          ) : (
            <p className="technical-offers-preview-hint">
              Seleziona un contenuto per visualizzare metadati e anteprima del testo.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
