import { useMutation } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ragSearch } from "../api/rag";
import type { RagSearchHit } from "../types/rag";
import { RagSearchResultCard, RagSourcesPanel } from "./RagSourcesPanel";
import "./GlobalSemanticSearch.css";

export function GlobalSemanticSearch() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const searchMutation = useMutation({
    mutationFn: ragSearch,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    setOpen(true);
    searchMutation.mutate({ query: trimmed, limit: 8 });
  }

  function handleOpenFullSearch() {
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setOpen(false);
    }
  }

  function handleSelectHit(hit: RagSearchHit) {
    const path = hit.source.url_path || hit.document?.url_path;
    if (path) {
      navigate(path);
      setOpen(false);
    }
  }

  const results = searchMutation.data?.results ?? [];
  const sources = searchMutation.data?.sources ?? [];

  return (
    <div className="global-semantic-search" ref={containerRef}>
      <form className="global-semantic-search__form" onSubmit={handleSubmit}>
        <input
          type="search"
          className="global-semantic-search__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2 && searchMutation.data) {
              setOpen(true);
            }
          }}
          placeholder="Ricerca semantica globale..."
          aria-label="Ricerca semantica globale"
          minLength={2}
        />
        <button
          type="submit"
          className="global-semantic-search__submit"
          disabled={searchMutation.isPending || query.trim().length < 2}
        >
          {searchMutation.isPending ? "..." : "Cerca"}
        </button>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="global-semantic-search__dropdown">
          {searchMutation.isError && (
            <p className="global-semantic-search__error">Errore durante la ricerca.</p>
          )}

          {!searchMutation.isPending && !searchMutation.isError && results.length === 0 && (
            <p className="global-semantic-search__empty">Nessun risultato.</p>
          )}

          {sources.length > 0 && (
            <RagSourcesPanel sources={sources} compact title="Fonti recuperate" />
          )}

          <div className="global-semantic-search__results">
            {results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                className="global-semantic-search__result"
                onClick={() => handleSelectHit(hit)}
              >
                <RagSearchResultCard hit={hit} />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="global-semantic-search__more"
            onClick={handleOpenFullSearch}
          >
            Apri ricerca completa
          </button>
        </div>
      )}
    </div>
  );
}
