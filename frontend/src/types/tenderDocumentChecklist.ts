export interface TenderDocumentChecklistItem {
  label: string;
  category: "core" | "formal_rule";
  matched: boolean;
  source: "sistema" | "disciplinare";
}

export interface TenderDocumentChecklist {
  required_count: number;
  matched_count: number;
  missing_count: number;
  required: TenderDocumentChecklistItem[];
  missing: TenderDocumentChecklistItem[];
  matched: TenderDocumentChecklistItem[];
  has_disciplinare: boolean;
}
