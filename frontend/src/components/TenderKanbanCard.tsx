import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { PriorityBadge } from "./PriorityBadge";
import type { Tender } from "../types/tender";
import "./TenderKanbanCard.css";

interface TenderKanbanCardProps {
  tender: Tender;
  isDragging?: boolean;
}

function formatImporto(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatScadenza(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TenderKanbanCard({ tender, isDragging = false }: TenderKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: tender.id,
    data: { tender, fase: tender.fase },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? " kanban-card--dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      <div className="kanban-card__header">
        <Link
          to={`/tenders/${tender.id}`}
          className="kanban-card__cig"
          onClick={(event) => event.stopPropagation()}
        >
          {tender.cig}
        </Link>
        <PriorityBadge priorita={tender.priorita} />
      </div>

      {tender.oggetto && <p className="kanban-card__oggetto">{tender.oggetto}</p>}

      <div className="kanban-card__meta">
        <span>{formatImporto(tender.importo)}</span>
        <span>{formatScadenza(tender.scadenza)}</span>
      </div>
    </article>
  );
}

export function TenderKanbanCardOverlay({ tender }: { tender: Tender }) {
  return <TenderKanbanCard tender={tender} isDragging />;
}
