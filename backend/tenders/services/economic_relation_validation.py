from __future__ import annotations

from dataclasses import dataclass, field

from ..models import EconomicRelation, Tender


@dataclass
class EconomicValidationIssue:
    code: str
    severity: str
    message: str
    line_item_id: str = ""


@dataclass
class EconomicValidationResult:
    valid: bool
    issues: list[EconomicValidationIssue] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "issues": [
                {
                    "code": issue.code,
                    "severity": issue.severity,
                    "message": issue.message,
                    "line_item_id": issue.line_item_id,
                }
                for issue in self.issues
            ],
        }


def validate_economic_relation(
    tender: Tender,
    relation: EconomicRelation,
    *,
    line_items: list[dict] | None = None,
) -> EconomicValidationResult:
    issues: list[EconomicValidationIssue] = []
    items = line_items if line_items is not None else (relation.line_items or [])
    outline = relation.outline or {}

    if not items:
        issues.append(
            EconomicValidationIssue(
                code="no_line_items",
                severity="error",
                message="L'offerta economica non contiene voci.",
            )
        )

    for item in items:
        item_id = str(item.get("id", ""))
        voce = str(item.get("voce", "")).strip()
        if not voce:
            issues.append(
                EconomicValidationIssue(
                    code="missing_voce",
                    severity="error",
                    message="Voce economica senza descrizione.",
                    line_item_id=item_id,
                )
            )

        if outline.get("pricing_model") == "ribasso_percentuale":
            ribasso = str(item.get("ribasso_percentuale", "")).strip()
            if not ribasso and item.get("order") == 1:
                issues.append(
                    EconomicValidationIssue(
                        code="missing_ribasso",
                        severity="warning",
                        message=f'Indicare il ribasso percentuale per "{voce[:60]}".',
                        line_item_id=item_id,
                    )
                )
        else:
            importo = str(item.get("importo", "")).strip()
            if not importo:
                issues.append(
                    EconomicValidationIssue(
                        code="missing_importo",
                        severity="warning",
                        message=f'Importo mancante per "{voce[:60]}".',
                        line_item_id=item_id,
                    )
                )

    importo_base = str(outline.get("importo_base", "") or tender.importo or "")
    totals = outline.get("totals") or {}
    if importo_base and totals.get("imponibile"):
        try:
            from decimal import Decimal

            base = Decimal(str(importo_base).replace(",", "."))
            imponibile = Decimal(str(totals["imponibile"]).replace(",", "."))
            if imponibile > base * Decimal("1.05"):
                issues.append(
                    EconomicValidationIssue(
                        code="importo_above_base",
                        severity="warning",
                        message="L'imponibile supera l'importo a base di gara.",
                    )
                )
        except Exception:
            pass

    has_errors = any(issue.severity == "error" for issue in issues)
    return EconomicValidationResult(valid=not has_errors, issues=issues)
