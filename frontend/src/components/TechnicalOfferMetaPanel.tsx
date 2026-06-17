import type { TechnicalOffer } from "../types/technicalOffer";
import {
  formatPunteggio,
  formatValoreAppalto,
  settoreLabel,
} from "../types/technicalOffer";
import "./TechnicalOfferMetaPanel.css";

interface TechnicalOfferMetaPanelProps {
  offer: TechnicalOffer;
}

function RatingBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="offer-meta-rating">
      <span className="offer-meta-rating__label">{label}</span>
      <div className="offer-meta-rating__bar" aria-hidden>
        <span className="offer-meta-rating__fill" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="offer-meta-rating__value">{value}/5</span>
    </div>
  );
}

export function TechnicalOfferMetaPanel({ offer }: TechnicalOfferMetaPanelProps) {
  const keywords = [...new Set([...offer.parole_chiave, ...offer.tags])];

  return (
    <div className="offer-meta-panel">
      <dl className="offer-meta-grid">
        <div>
          <dt>Categoria</dt>
          <dd>{offer.category_display}</dd>
        </div>
        {offer.settore && (
          <div>
            <dt>Settore</dt>
            <dd>{offer.settore_display || settoreLabel(offer.settore)}</dd>
          </div>
        )}
        {offer.tipologia_servizio && (
          <div>
            <dt>Tipologia servizio</dt>
            <dd>{offer.tipologia_servizio}</dd>
          </div>
        )}
        {offer.ente_appaltante && (
          <div>
            <dt>Ente appaltante</dt>
            <dd>{offer.ente_appaltante}</dd>
          </div>
        )}
        {offer.valore_appalto && (
          <div>
            <dt>Valore appalto</dt>
            <dd>{formatValoreAppalto(offer.valore_appalto)}</dd>
          </div>
        )}
        {offer.durata && (
          <div>
            <dt>Durata</dt>
            <dd>{offer.durata}</dd>
          </div>
        )}
        {offer.anno && (
          <div>
            <dt>Anno</dt>
            <dd>{offer.anno}</dd>
          </div>
        )}
        {offer.punteggio_ottenuto && (
          <div>
            <dt>Punteggio ottenuto</dt>
            <dd>{formatPunteggio(offer.punteggio_ottenuto)}</dd>
          </div>
        )}
      </dl>

      <RatingBar value={offer.riutilizzabilita} label="Riutilizzabilità" />
      <RatingBar value={offer.innovativita} label="Innovatività" />

      {keywords.length > 0 && (
        <div className="offer-meta-keywords">
          <span className="offer-meta-keywords__label">Parole chiave</span>
          <ul>
            {keywords.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
