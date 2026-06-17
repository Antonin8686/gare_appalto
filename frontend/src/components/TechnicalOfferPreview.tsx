import "./TechnicalOfferPreview.css";

interface TechnicalOfferPreviewProps {
  title?: string;
  content: string;
  emptyMessage?: string;
}

export function TechnicalOfferPreview({
  title,
  content,
  emptyMessage = "Nessun contenuto da visualizzare.",
}: TechnicalOfferPreviewProps) {
  const trimmed = content.trim();

  return (
    <div className="technical-offer-preview">
      {title && <h4 className="technical-offer-preview__title">{title}</h4>}
      {trimmed ? (
        <pre className="technical-offer-preview__body">{content}</pre>
      ) : (
        <p className="technical-offer-preview__empty">{emptyMessage}</p>
      )}
    </div>
  );
}
