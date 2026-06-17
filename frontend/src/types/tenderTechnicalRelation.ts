export interface TechnicalRelationCriterion {
  id: string;
  title: string;
  category: string;
  max_points: number | null;
  description: string;
  suggested_pages: number;
}

export interface TechnicalRelationPagePlanEntry {
  order: number;
  criterion_id: string;
  title: string;
  pages: number;
}

export interface TechnicalRelationPagePlan {
  max_pages: number | null;
  total_suggested_pages: number;
  entries: TechnicalRelationPagePlanEntry[];
}

export interface TechnicalRelationFormalConstraintItem {
  label: string;
  detail: string;
}

export interface TechnicalRelationOutline {
  criteria: TechnicalRelationCriterion[];
  page_plan: TechnicalRelationPagePlan;
  formal_constraints: Record<string, TechnicalRelationFormalConstraintItem[]>;
  source_summary: string;
}

export interface TechnicalRelationSection {
  id: string;
  criterion_id: string;
  title: string;
  category: string;
  content: string;
  order: number;
  suggested_pages: number;
  completed: boolean;
}

export interface TechnicalRelation {
  id: number;
  tender: number;
  company_id: number | null;
  outline: TechnicalRelationOutline;
  sections: TechnicalRelationSection[];
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicalRelationPatchPayload {
  company_id?: number | null;
  sections?: TechnicalRelationSection[];
}

export interface GenerateOutlinePayload {
  company_id?: number | null;
}

export interface TechnicalRelationVersion {
  id: number;
  version: number;
  company_id: number | null;
  company_name: string | null;
  outline: TechnicalRelationOutline;
  sections: TechnicalRelationSection[];
  change_note: string;
  created_by_email: string | null;
  created_at: string;
}

export function emptyTechnicalRelationOutline(): TechnicalRelationOutline {
  return {
    criteria: [],
    page_plan: {
      max_pages: null,
      total_suggested_pages: 0,
      entries: [],
    },
    formal_constraints: {},
    source_summary: "",
  };
}

export function countCompletedSections(sections: TechnicalRelationSection[]): {
  total: number;
  completed: number;
} {
  const total = sections.length;
  const completed = sections.filter((section) => section.completed).length;
  return { total, completed };
}

export function sortSectionsByOrder(
  sections: TechnicalRelationSection[],
): TechnicalRelationSection[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

export function reorderSections(
  sections: TechnicalRelationSection[],
  activeId: string,
  overId: string,
): TechnicalRelationSection[] {
  const sorted = sortSectionsByOrder(sections);
  const oldIndex = sorted.findIndex((section) => section.id === activeId);
  const newIndex = sorted.findIndex((section) => section.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return sorted;
  }

  const moved = [...sorted];
  const [item] = moved.splice(oldIndex, 1);
  moved.splice(newIndex, 0, item);

  return moved.map((section, index) => ({
    ...section,
    order: index + 1,
  }));
}

export function sectionsSaveFingerprint(
  sections: TechnicalRelationSection[],
  companyId: number | null,
): string {
  const payload = sortSectionsByOrder(sections).map((section) => ({
    id: section.id,
    criterion_id: section.criterion_id,
    title: section.title,
    category: section.category,
    content: section.content,
    order: section.order,
    suggested_pages: section.suggested_pages,
    completed: section.completed,
  }));
  return JSON.stringify({ companyId, sections: payload });
}
