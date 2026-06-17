import re
import uuid
from dataclasses import dataclass, field
from typing import Any

from ..models import Requirement, TechnicalRelation, Tender

CHARS_PER_PAGE = 3000
PAGE_OVERFLOW_TOLERANCE = 1.15
ITALIAN_STOPWORDS = frozenset(
    {
        "alla",
        "alle",
        "allo",
        "anche",
        "anno",
        "anni",
        "come",
        "con",
        "dagli",
        "dalla",
        "dalle",
        "dallo",
        "dei",
        "degli",
        "del",
        "dell",
        "della",
        "delle",
        "dello",
        "deve",
        "devono",
        "dopo",
        "dove",
        "essere",
        "gara",
        "nella",
        "nelle",
        "nello",
        "ogni",
        "oltre",
        "per",
        "più",
        "presso",
        "quali",
        "quale",
        "qualora",
        "quando",
        "quanto",
        "questa",
        "queste",
        "questi",
        "questo",
        "senza",
        "soglia",
        "sono",
        "sotto",
        "sua",
        "sue",
        "sui",
        "sul",
        "sull",
        "sulla",
        "sulle",
        "sullo",
        "suo",
        "suoi",
        "tale",
        "tali",
        "tramite",
        "tra",
        "tutti",
        "tutte",
        "uno",
        "una",
        "agli",
        "alla",
        "dell",
        "della",
        "delle",
        "minimo",
        "massimo",
        "almeno",
        "servizio",
        "servizi",
        "requisito",
        "requisiti",
        "offerta",
        "tecnica",
        "relazione",
    }
)


@dataclass
class ValidationWarning:
    id: str
    type: str
    severity: str
    message: str
    section_id: str | None = None
    requirement_id: int | None = None
    detail: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "message": self.message,
            "section_id": self.section_id,
            "requirement_id": self.requirement_id,
            "detail": self.detail,
        }


@dataclass
class SectionPageStat:
    section_id: str
    title: str
    estimated_pages: float
    suggested_pages: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "section_id": self.section_id,
            "title": self.title,
            "estimated_pages": self.estimated_pages,
            "suggested_pages": self.suggested_pages,
        }


@dataclass
class ValidationResult:
    warnings: list[ValidationWarning] = field(default_factory=list)
    page_stats: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        counts = {"rosso": 0, "giallo": 0, "info": 0}
        for warning in self.warnings:
            counts[warning.severity] = counts.get(warning.severity, 0) + 1
        counts["totale"] = len(self.warnings)
        return {
            "warnings": [item.to_dict() for item in self.warnings],
            "summary": counts,
            "page_stats": self.page_stats,
        }


def _new_warning_id() -> str:
    return uuid.uuid4().hex[:12]


def estimate_pages(content: str) -> float:
    stripped = content.strip()
    if not stripped:
        return 0.0
    return round(len(stripped) / CHARS_PER_PAGE, 1)


def _extract_keywords(text: str) -> set[str]:
    tokens = re.findall(r"[a-zàèéìòù]{4,}", text.lower())
    return {token for token in tokens if token not in ITALIAN_STOPWORDS}


def _keyword_coverage(keywords: set[str], content: str) -> float:
    if not keywords:
        return 1.0
    lowered = content.lower()
    matched = sum(1 for keyword in keywords if keyword in lowered)
    return matched / len(keywords)


def _validate_pagine(
    sections: list[dict],
    outline: dict,
    warnings: list[ValidationWarning],
    section_stats: list[SectionPageStat],
) -> float:
    page_plan = outline.get("page_plan", {})
    max_pages = page_plan.get("max_pages")
    total_estimated = 0.0

    for section in sections:
        content = section.get("content", "")
        estimated = estimate_pages(content)
        suggested = int(section.get("suggested_pages") or 0)
        total_estimated += estimated

        section_stats.append(
            SectionPageStat(
                section_id=section.get("id", ""),
                title=section.get("title", ""),
                estimated_pages=estimated,
                suggested_pages=suggested,
            )
        )

        section_id = section.get("id")
        title = section.get("title", "Sezione")

        if not content.strip():
            if section.get("completed"):
                warnings.append(
                    ValidationWarning(
                        id=_new_warning_id(),
                        type="pagine",
                        severity="giallo",
                        message=f'"{title}" è segnata completata ma non contiene testo.',
                        section_id=section_id,
                    )
                )
            else:
                warnings.append(
                    ValidationWarning(
                        id=_new_warning_id(),
                        type="pagine",
                        severity="info",
                        message=f'"{title}" è ancora vuota.',
                        section_id=section_id,
                    )
                )
            continue

        if suggested > 0 and estimated > suggested * PAGE_OVERFLOW_TOLERANCE:
            warnings.append(
                ValidationWarning(
                    id=_new_warning_id(),
                    type="pagine",
                    severity="giallo",
                    message=(
                        f'"{title}" supera il budget pagine: stimato {estimated} '
                        f"vs {suggested} pianificate."
                    ),
                    section_id=section_id,
                    detail=f"stimato={estimated}, pianificato={suggested}",
                )
            )

    if max_pages is not None and total_estimated > max_pages:
        overflow = round(total_estimated - max_pages, 1)
        warnings.append(
            ValidationWarning(
                id=_new_warning_id(),
                type="pagine",
                severity="rosso",
                message=(
                    f"Il documento supera il limite di {max_pages} pagine "
                    f"(stima attuale: {round(total_estimated, 1)}, +{overflow})."
                ),
                detail=f"max={max_pages}, stimato={round(total_estimated, 1)}",
            )
        )
    elif max_pages is not None and total_estimated > max_pages * 0.9:
        warnings.append(
            ValidationWarning(
                id=_new_warning_id(),
                type="pagine",
                severity="giallo",
                message=(
                    f"Il documento è vicino al limite di {max_pages} pagine "
                    f"(stima: {round(total_estimated, 1)})."
                ),
                detail=f"max={max_pages}, stimato={round(total_estimated, 1)}",
            )
        )

    total_suggested = page_plan.get("total_suggested_pages", 0)
    if max_pages and total_suggested > max_pages:
        warnings.append(
            ValidationWarning(
                id=_new_warning_id(),
                type="pagine",
                severity="giallo",
                message=(
                    f"Il piano pagine ({total_suggested}) supera il limite "
                    f"formale di {max_pages} pagine."
                ),
            )
        )

    return total_estimated


def _validate_requisiti(
    tender: Tender,
    combined_content: str,
    warnings: list[ValidationWarning],
) -> None:
    requirements = Requirement.objects.filter(
        tender=tender,
        tipo__in=[Requirement.Tipo.OBBLIGATORIO, Requirement.Tipo.TECNICO],
    ).order_by("tipo", "created_at")

    for requirement in requirements:
        keywords = _extract_keywords(requirement.descrizione)
        if len(keywords) < 2:
            keywords = _extract_keywords(f"{requirement.descrizione} {requirement.soglia}")
        if not keywords:
            continue

        coverage = _keyword_coverage(keywords, combined_content)
        short_desc = requirement.descrizione[:80] + (
            "…" if len(requirement.descrizione) > 80 else ""
        )

        if coverage >= 0.35:
            continue

        severity = "rosso" if requirement.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo"
        if coverage > 0:
            severity = "giallo"

        missing = sorted(keywords - {k for k in keywords if k in combined_content.lower()})[:5]
        detail = f"copertura={int(coverage * 100)}%"
        if missing:
            detail += f", termini mancanti: {', '.join(missing)}"

        warnings.append(
            ValidationWarning(
                id=_new_warning_id(),
                type="requisiti",
                severity=severity,
                message=f'Il requisito "{short_desc}" non risulta trattato nell\'offerta.',
                requirement_id=requirement.id,
                detail=detail,
            )
        )


def _validate_coerenza(
    sections: list[dict],
    outline: dict,
    warnings: list[ValidationWarning],
) -> None:
    criteria_by_id = {
        criterion["id"]: criterion for criterion in outline.get("criteria", [])
    }

    titles: dict[str, list[str]] = {}
    for section in sections:
        title = section.get("title", "").strip().lower()
        if not title:
            continue
        titles.setdefault(title, []).append(section.get("id", ""))

    for title, section_ids in titles.items():
        if len(section_ids) > 1:
            warnings.append(
                ValidationWarning(
                    id=_new_warning_id(),
                    type="coerenza",
                    severity="giallo",
                    message=f'Titolo duplicato "{title.title()}" in {len(section_ids)} sezioni.',
                    section_id=section_ids[0],
                    detail=f"sezioni={','.join(section_ids)}",
                )
            )

    for section in sections:
        section_id = section.get("id")
        criterion_id = section.get("criterion_id")
        criterion = criteria_by_id.get(criterion_id) if criterion_id else None

        if criterion_id and not criterion:
            warnings.append(
                ValidationWarning(
                    id=_new_warning_id(),
                    type="coerenza",
                    severity="giallo",
                    message=(
                        f'"{section.get("title", "Sezione")}" non è collegata a un criterio '
                        "dell'outline."
                    ),
                    section_id=section_id,
                )
            )
            continue

        if not criterion:
            continue

        section_title = section.get("title", "").strip().lower()
        criterion_title = criterion.get("title", "").strip().lower()
        if section_title and criterion_title and section_title != criterion_title:
            warnings.append(
                ValidationWarning(
                    id=_new_warning_id(),
                    type="coerenza",
                    severity="info",
                    message=(
                        f'Il titolo della sezione "{section.get("title")}" differisce dal '
                        f'criterio "{criterion.get("title")}".'
                    ),
                    section_id=section_id,
                )
            )

        content = section.get("content", "").strip()
        description = criterion.get("description", "").strip()
        if content and description:
            desc_keywords = _extract_keywords(description)
            if desc_keywords:
                coverage = _keyword_coverage(desc_keywords, content)
                if coverage < 0.2:
                    warnings.append(
                        ValidationWarning(
                            id=_new_warning_id(),
                            type="coerenza",
                            severity="giallo",
                            message=(
                                f'"{section.get("title")}" potrebbe non rispondere pienamente '
                                "al criterio di valutazione."
                            ),
                            section_id=section_id,
                            detail=f"allineamento criterio={int(coverage * 100)}%",
                        )
                    )

    non_empty = [section for section in sections if section.get("content", "").strip()]
    empty = [section for section in sections if not section.get("content", "").strip()]
    if len(sections) >= 3 and len(non_empty) == 1 and len(empty) >= 2:
        dominant = non_empty[0]
        warnings.append(
            ValidationWarning(
                id=_new_warning_id(),
                type="coerenza",
                severity="giallo",
                message=(
                    f'La maggior parte del contenuto è concentrata in "{dominant.get("title")}" '
                    f"mentre {len(empty)} sezioni restano vuote."
                ),
                section_id=dominant.get("id"),
            )
        )

    completed_empty = [
        section
        for section in sections
        if section.get("completed") and not section.get("content", "").strip()
    ]
    for section in completed_empty:
        warnings.append(
            ValidationWarning(
                id=_new_warning_id(),
                type="coerenza",
                severity="rosso",
                message=(
                    f'"{section.get("title")}" è completata ma priva di contenuto.'
                ),
                section_id=section.get("id"),
            )
        )


def validate_technical_relation(
    tender: Tender,
    relation: TechnicalRelation,
    *,
    sections: list[dict] | None = None,
) -> ValidationResult:
    active_sections = sections if sections is not None else relation.sections
    outline = relation.outline or {}
    warnings: list[ValidationWarning] = []
    section_stats: list[SectionPageStat] = []

    total_estimated = _validate_pagine(active_sections, outline, warnings, section_stats)

    combined_content = "\n\n".join(
        section.get("content", "") for section in active_sections if section.get("content")
    )
    _validate_requisiti(tender, combined_content, warnings)
    _validate_coerenza(active_sections, outline, warnings)

    severity_order = {"rosso": 0, "giallo": 1, "info": 2}
    warnings.sort(key=lambda item: (severity_order.get(item.severity, 3), item.type))

    page_plan = outline.get("page_plan", {})
    return ValidationResult(
        warnings=warnings,
        page_stats={
            "max_pages": page_plan.get("max_pages"),
            "total_estimated_pages": round(total_estimated, 1),
            "total_suggested_pages": page_plan.get("total_suggested_pages", 0),
            "sections": [item.to_dict() for item in section_stats],
        },
    )
