import type { TenderPriorita } from "../types/tender";
import { TENDER_PRIORITA_LABELS } from "../types/tender";
import "./PriorityBadge.css";

interface PriorityBadgeProps {
  priorita: TenderPriorita;
  score?: number;
  showScore?: boolean;
}

export function PriorityBadge({ priorita, score, showScore = false }: PriorityBadgeProps) {
  return (
    <span className={`priority-badge priority-badge--${priorita}`}>
      {TENDER_PRIORITA_LABELS[priorita]}
      {showScore && score !== undefined && (
        <span className="priority-badge__score">{score}</span>
      )}
    </span>
  );
}
