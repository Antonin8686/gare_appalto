import { Link } from "react-router-dom";
import type { RagDocumentSource, RagSearchHit, RagSource } from "../types/rag";
import { RAG_SOURCE_TYPE_LABELS } from "../types/rag";
import "./RagSourcesPanel.css";

interface RagSourcesPanelProps {
  sources: RagSource[];
  title?: string;
  compact?: boolean;
}

export function RagSourcesPanel({
  sources,
  title = "Documenti e fonti utilizzate",
  compact = false,
}: RagSourcesPanelProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <section className={`rag-sources-panel${compact ? " rag-sources-panel--compact" : ""}`}>
      <div className="rag-sources-panel__header">
        <h3>{title}</h3>
        <span>{sources.length}</span>
      </div>
      <ul className="rag-sources-panel__list">
        {sources.map((source) => (
          <li key={`${source.source_type}-${source.source_id}`}>
            <RagSourceLink source={source} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface RagSearchResultCardProps {
  hit: RagSearchHit;
}

export function RagSearchResultCard({ hit }: RagSearchResultCardProps) {
  const similarityLabel =
    hit.similarity != null ? `${Math.round(hit.similarity * 100)}%` : null;

  return (
    <article className="rag-result-card">
      <div className="rag-result-card__header">
        <div>
          <span className="rag-result-card__type">
            {hit.source_type_label || RAG_SOURCE_TYPE_LABELS[hit.source_type]}
          </span>
          <h4>{hit.title}</h4>
        </div>
        {similarityLabel && (
          <span className="rag-result-card__similarity">{similarityLabel}</span>
        )}
      </div>

      <p className="rag-result-card__excerpt">{hit.excerpt}</p>

      <div className="rag-result-card__meta">
        <RagSourceLink source={hit.source} />
        {hit.document && <RagDocumentLink document={hit.document} />}
        {typeof hit.metadata.tender_cig === "string" && hit.metadata.tender_cig && (
          <span>Gara {hit.metadata.tender_cig}</span>
        )}
        {typeof hit.metadata.company_name === "string" && hit.metadata.company_name && (
          <span>{hit.metadata.company_name}</span>
        )}
      </div>
    </article>
  );
}

function RagSourceLink({ source }: { source: RagSource }) {
  const label = source.title || RAG_SOURCE_TYPE_LABELS[source.source_type];
  if (source.url_path) {
    return (
      <Link to={source.url_path} className="rag-source-link">
        {label}
      </Link>
    );
  }
  return <span className="rag-source-link rag-source-link--static">{label}</span>;
}

function RagDocumentLink({ document }: { document: RagDocumentSource }) {
  const label = document.name || document.original_filename || `Documento #${document.id}`;
  if (document.url_path) {
    return (
      <Link to={document.url_path} className="rag-document-link">
        Doc: {label}
      </Link>
    );
  }
  return <span className="rag-document-link rag-document-link--static">Doc: {label}</span>;
}
