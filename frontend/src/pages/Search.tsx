import { useMutation } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ragSearch } from "../api/rag";
import type { RagSourceType } from "../types/rag";
import { RAG_SOURCE_TYPE_LABELS } from "../types/rag";
import { RagSearchResultCard, RagSourcesPanel } from "../components/RagSourcesPanel";
import { fieldValidation, validateForm } from "../utils/formValidation";
import "./Search.css";

const ALL_SOURCE_TYPES: RagSourceType[] = [
  "tender_document",
  "technical_offer",
  "requirement",
  "company",
];

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<RagSourceType[]>(ALL_SOURCE_TYPES);

  const searchMutation = useMutation({
    mutationFn: ragSearch,
  });

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      setSubmittedQuery(initialQuery.trim());
      searchMutation.mutate({
        query: initialQuery.trim(),
        limit: 25,
        source_types: selectedTypes,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    setSubmittedQuery(trimmed);
    searchMutation.mutate({
      query: trimmed,
      limit: 25,
      source_types: selectedTypes.length === ALL_SOURCE_TYPES.length ? undefined : selectedTypes,
    });
  }

  function toggleSourceType(type: RagSourceType) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  const results = searchMutation.data?.results ?? [];
  const sources = searchMutation.data?.sources ?? [];

  const grouped = ALL_SOURCE_TYPES.reduce<Record<RagSourceType, typeof results>>(
    (acc, type) => {
      acc[type] = results.filter((item) => item.source_type === type);
      return acc;
    },
    {
      tender_document: [],
      technical_offer: [],
      requirement: [],
      company: [],
    },
  );

  return (
    <div className="search-page">
      <header className="search-page-header">
        <div>
          <h2>Ricerca semantica</h2>
          <p>
            Cerca su documenti gara, offerte tecniche, requisiti e profili aziendali con
            similarità vettoriale.
          </p>
        </div>
      </header>

      <form className="search-page-form" onSubmit={handleSubmit} noValidate>
        <div className="search-page-input-wrap">
          <input
            type="search"
            className="search-page-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Es. certificazione ISO, requisiti economici, esperienza pulizie..."
            minLength={2}
            required
            {...fieldValidation({
              required: "Scrivi cosa vuoi cercare",
              tooShort: "La ricerca deve contenere almeno 2 caratteri",
            })}
          />
          <button
            type="submit"
            className="search-page-submit"
            disabled={searchMutation.isPending || query.trim().length < 2}
          >
            {searchMutation.isPending ? "Ricerca..." : "Cerca"}
          </button>
        </div>

        <div className="search-page-filters">
          {ALL_SOURCE_TYPES.map((type) => (
            <label key={type} className="search-page-filter">
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleSourceType(type)}
              />
              {RAG_SOURCE_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </form>

      {searchMutation.isError && (
        <p className="search-page-error">
          Errore durante la ricerca. Verifica che il backend sia avviato, pgvector configurato e
          l&apos;indice RAG popolato (
          <code>python manage.py reindex_rag</code>).
        </p>
      )}

      {submittedQuery && !searchMutation.isPending && !searchMutation.isError && (
        <p className="search-page-summary">
          {results.length === 0
            ? `Nessun risultato per "${submittedQuery}".`
            : `${results.length} risultat${results.length === 1 ? "o" : "i"} per "${submittedQuery}".`}
        </p>
      )}

      {sources.length > 0 && (
        <RagSourcesPanel sources={sources} title="Documenti e fonti utilizzate per il recupero" />
      )}

      {ALL_SOURCE_TYPES.map((type) => {
        const items = grouped[type];
        if (items.length === 0) {
          return null;
        }
        return (
          <section key={type} className="search-page-section">
            <div className="search-page-section-header">
              <h3>{RAG_SOURCE_TYPE_LABELS[type]}</h3>
              <span>{items.length}</span>
            </div>
            <div className="search-page-results">
              {items.map((item) => (
                <RagSearchResultCard key={item.id} hit={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
