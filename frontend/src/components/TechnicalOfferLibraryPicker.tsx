import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchTechnicalOfferMatches } from "../api/technicalOffers";
import { TechnicalOfferPreview } from "./TechnicalOfferPreview";
import type { TechnicalOfferLibraryMatch } from "../types/technicalOffer";
import "./TechnicalOfferLibraryPicker.css";

interface TechnicalOfferLibraryPickerProps {
  open: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionCategory?: string;
  tenderOggetto?: string;
  currentContent?: string;
  onInsert: (content: string, match: TechnicalOfferLibraryMatch, mode: "replace" | "append") => void;
}

export function TechnicalOfferLibraryPicker({
  open,
  onClose,
  sectionTitle,
  sectionCategory = "",
  tenderOggetto = "",
  currentContent = "",
  onInsert,
}: TechnicalOfferLibraryPickerProps) {
  const [search, setSearch] = useState(sectionTitle);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setSearch(sectionTitle);
      setSelectedId(null);
    }
  }, [open, sectionTitle]);

  const { data: matches = [], isLoading, isError } = useQuery({
    queryKey: ["technical-offers", "matches", search, sectionCategory, tenderOggetto],
    queryFn: () =>
      fetchTechnicalOfferMatches({
        section_title: search.trim() || sectionTitle,
        category: sectionCategory,
        tender_oggetto: tenderOggetto,
        limit: 8,
      }),
    enabled: open && Boolean((search.trim() || sectionTitle).length),
  });

  const selected = matches.find((item) => item.offer_id === selectedId) ?? matches[0] ?? null;

  if (!open) {
    return null;
  }

  function apply(mode: "replace" | "append") {
    if (!selected) return;
    const next =
      mode === "append" && currentContent.trim()
        ? `${currentContent.trim()}\n\n${selected.content.trim()}`
        : selected.content.trim();
    onInsert(next, selected, mode);
    onClose();
  }

  return (
    <div className="technical-offer-library-picker-backdrop" onClick={onClose}>
      <div
        className="technical-offer-library-picker"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-picker-title"
      >
        <header className="technical-offer-library-picker__header">
          <div>
            <h3 id="library-picker-title">Inserisci da libreria</h3>
            <p>Sezione: {sectionTitle}</p>
          </div>
          <button type="button" className="technical-offer-library-picker__close" onClick={onClose}>
            Chiudi
          </button>
        </header>

        <label className="technical-offer-library-picker__search">
          Cerca nella libreria
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Titolo, contenuto, parole chiave..."
          />
        </label>

        <div className="technical-offer-library-picker__body">
          <aside className="technical-offer-library-picker__list">
            {isLoading && <p>Caricamento suggerimenti...</p>}
            {isError && <p>Errore nel recupero della libreria.</p>}
            {!isLoading && !matches.length && (
              <p>
                Nessun contenuto trovato. Importa offerte passate in{" "}
                <strong>Libreria OT</strong>.
              </p>
            )}
            <ul>
              {matches.map((match) => (
                <li key={match.offer_id}>
                  <button
                    type="button"
                    className={
                      (selected?.offer_id === match.offer_id
                        ? "technical-offer-library-picker__item--active "
                        : "") + "technical-offer-library-picker__item"
                    }
                    onClick={() => setSelectedId(match.offer_id)}
                  >
                    <strong>{match.title}</strong>
                    <span>{match.category_label}</span>
                    {match.similarity != null && (
                      <span>{Math.round(match.similarity * 100)}% match</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="technical-offer-library-picker__preview">
            {selected ? (
              <>
                <h4>{selected.title}</h4>
                <TechnicalOfferPreview content={selected.content} />
              </>
            ) : (
              <p>Seleziona un contenuto per l&apos;anteprima.</p>
            )}
          </div>
        </div>

        <footer className="technical-offer-library-picker__footer">
          <button type="button" onClick={onClose}>
            Annulla
          </button>
          <button type="button" disabled={!selected} onClick={() => apply("append")}>
            Aggiungi in fondo
          </button>
          <button
            type="button"
            className="technical-offer-library-picker__primary"
            disabled={!selected}
            onClick={() => apply("replace")}
          >
            Sostituisci sezione
          </button>
        </footer>
      </div>
    </div>
  );
}
