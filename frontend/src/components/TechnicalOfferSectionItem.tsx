import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TechnicalRelationCriterion, TechnicalRelationSection } from "../types/tenderTechnicalRelation";
import type { ValidationSeverity } from "../types/technicalRelationValidation";

interface TechnicalOfferSectionItemProps {
  section: TechnicalRelationSection;
  index: number;
  criterion: TechnicalRelationCriterion | undefined;
  isActive: boolean;
  warningSeverity: ValidationSeverity | null;
  warningCount: number;
  onSelect: (sectionId: string) => void;
}

export function TechnicalOfferSectionItem({
  section,
  index,
  criterion,
  isActive,
  warningSeverity,
  warningCount,
  onSelect,
}: TechnicalOfferSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      id={`offer-section-${section.id}`}
      ref={setNodeRef}
      style={style}
      className={`tender-technical-offer-section-item${
        isActive ? " tender-technical-offer-section-item--active" : ""
      }${isDragging ? " tender-technical-offer-section-item--dragging" : ""}${
        warningSeverity
          ? ` tender-technical-offer-section-item--warning-${warningSeverity}`
          : ""
      }`}
    >
      <button
        type="button"
        className="tender-technical-offer-section-handle"
        ref={setActivatorNodeRef}
        aria-label={`Riordina sezione ${section.title}`}
        {...listeners}
        {...attributes}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>

      <button
        type="button"
        className="tender-technical-offer-section-select"
        onClick={() => onSelect(section.id)}
      >
        <span className="tender-technical-offer-section-order">{index + 1}</span>
        <span className="tender-technical-offer-section-body">
          <span className="tender-technical-offer-section-title-row">
            <span className="tender-technical-offer-section-title">{section.title}</span>
            {warningCount > 0 && (
              <span
                className={`tender-technical-offer-section-warning-badge tender-technical-offer-section-warning-badge--${warningSeverity}`}
                title={`${warningCount} criticità`}
              >
                {warningCount}
              </span>
            )}
          </span>
          <span className="tender-technical-offer-section-meta">
            {criterion?.max_points !== null && criterion?.max_points !== undefined && (
              <>{criterion.max_points} pt · </>
            )}
            {section.suggested_pages} pag.
            {section.completed && (
              <span className="tender-technical-offer-section-done"> · completata</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
