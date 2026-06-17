import re
import uuid
from typing import TypedDict

from django.utils import timezone

from companies.models import Company
from technical_offers.models import TechnicalOffer

from ..models import Document, Requirement, TechnicalRelation, Tender, default_technical_relation_outline

CRITERION_PATTERN = re.compile(
    r"criterio\s+(?:di\s+)?(?:valutazione\s+)?(?:tecnico|tecnica)?\s*[:\-]\s*"
    r"(.+?)(?:\s*[-–]\s*(?:punteggio|punti|peso)\s*[:\-]?\s*(\d+(?:[.,]\d+)?))?(?:\n|$)",
    re.IGNORECASE,
)
MAX_PAGES_PATTERN = re.compile(
    r"(?:offerta\s+tecnica|relazione\s+tecnica).*?max(?:imo)?\s*(\d+)\s*pagine",
    re.IGNORECASE,
)

DEFAULT_CRITERIA = [
    {
        "title": "Organizzazione del servizio",
        "category": TechnicalOffer.Category.ORGANIZZAZIONE,
        "max_points": 20,
        "description": "Struttura organizzativa, referenti e modalità di coordinamento.",
    },
    {
        "title": "Metodologia operativa",
        "category": TechnicalOffer.Category.METODOLOGIA,
        "max_points": 25,
        "description": "Procedure operative, tempi di intervento e flussi di lavoro.",
    },
    {
        "title": "Personale e formazione",
        "category": TechnicalOffer.Category.PERSONALE,
        "max_points": 20,
        "description": "Qualifiche, esperienze e piano di formazione del personale.",
    },
    {
        "title": "Attrezzature e mezzi",
        "category": TechnicalOffer.Category.ATTREZZATURE,
        "max_points": 15,
        "description": "Dotazioni strumentali e mezzi impiegati nell'esecuzione.",
    },
    {
        "title": "Sicurezza sul lavoro",
        "category": TechnicalOffer.Category.SICUREZZA,
        "max_points": 10,
        "description": "Misure di prevenzione, DPI e gestione dei rischi.",
    },
    {
        "title": "Tutela ambientale",
        "category": TechnicalOffer.Category.AMBIENTE,
        "max_points": 5,
        "description": "Impatto ambientale e misure di sostenibilità.",
    },
    {
        "title": "Sistema qualità",
        "category": TechnicalOffer.Category.QUALITA,
        "max_points": 5,
        "description": "Certificazioni e controlli qualità del servizio.",
    },
]


class GeneratedCriterion(TypedDict):
    id: str
    title: str
    category: str
    max_points: float | None
    description: str
    suggested_pages: int


class GeneratedOutline(TypedDict):
    criteria: list[GeneratedCriterion]
    page_plan: dict
    formal_constraints: dict
    source_summary: str


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _parse_max_pages(tender: Tender, combined_text: str) -> int | None:
    for item in tender.formal_rules.get("pagine", []):
        label = f"{item.get('label', '')} {item.get('detail', '')}"
        match = MAX_PAGES_PATTERN.search(label)
        if match:
            return int(match.group(1))

    match = MAX_PAGES_PATTERN.search(combined_text)
    if match:
        return int(match.group(1))
    return None


def _extract_criteria_from_text(text: str) -> list[dict]:
    criteria = []
    for match in CRITERION_PATTERN.finditer(text):
        title = match.group(1).strip()
        points_raw = match.group(2)
        max_points = None
        if points_raw:
            max_points = float(points_raw.replace(",", "."))
        criteria.append(
            {
                "title": title,
                "category": TechnicalOffer.Category.ALTRO,
                "max_points": max_points,
                "description": f"Risposta al criterio: {title}",
            }
        )
    return criteria


def _criteria_from_requirements(tender: Tender) -> list[dict]:
    requirements = Requirement.objects.filter(
        tender=tender,
        tipo=Requirement.Tipo.TECNICO,
    ).order_by("created_at")
    return [
        {
            "title": req.descrizione[:120],
            "category": TechnicalOffer.Category.ALTRO,
            "max_points": None,
            "description": req.descrizione,
        }
        for req in requirements
    ]


def _build_page_plan(
    criteria: list[GeneratedCriterion],
    max_pages: int | None,
) -> dict:
    total_points = sum(c["max_points"] or 0 for c in criteria) or len(criteria)
    entries = []
    total_suggested = 0

    for index, criterion in enumerate(criteria, start=1):
        if max_pages and total_points:
            weight = (criterion["max_points"] or 1) / total_points
            pages = max(1, round(max_pages * weight))
        elif max_pages:
            pages = max(1, round(max_pages / len(criteria)))
        else:
            pages = 2

        criterion["suggested_pages"] = pages
        total_suggested += pages
        entries.append(
            {
                "order": index,
                "criterion_id": criterion["id"],
                "title": criterion["title"],
                "pages": pages,
            }
        )

    if max_pages and total_suggested > max_pages:
        overflow = total_suggested - max_pages
        for entry in reversed(entries):
            if overflow <= 0:
                break
            if entry["pages"] > 1:
                entry["pages"] -= 1
                overflow -= 1
        total_suggested = sum(entry["pages"] for entry in entries)
        for criterion in criteria:
            matching = next(
                (e for e in entries if e["criterion_id"] == criterion["id"]),
                None,
            )
            if matching:
                criterion["suggested_pages"] = matching["pages"]

    return {
        "max_pages": max_pages,
        "total_suggested_pages": total_suggested,
        "entries": entries,
    }


def _formal_constraints_from_tender(tender: Tender) -> dict:
    constraints = {}
    for category, items in tender.formal_rules.items():
        if not items:
            continue
        constraints[category] = [
            {
                "label": item.get("label", ""),
                "detail": item.get("detail", ""),
            }
            for item in items
        ]
    return constraints


def _sections_from_criteria(criteria: list[GeneratedCriterion]) -> list[dict]:
    return [
        {
            "id": _new_id(),
            "criterion_id": criterion["id"],
            "title": criterion["title"],
            "category": criterion["category"],
            "content": "",
            "order": index,
            "suggested_pages": criterion["suggested_pages"],
            "completed": False,
        }
        for index, criterion in enumerate(criteria, start=1)
    ]


def generate_technical_relation_outline(
    tender: Tender,
    company: Company | None = None,
) -> GeneratedOutline:
    documents = Document.objects.filter(
        tender=tender,
        status=Document.Status.DONE,
    ).order_by("-uploaded_at")

    combined_text = "\n\n".join(doc.text_content for doc in documents if doc.text_content)

    raw_criteria = _extract_criteria_from_text(combined_text)
    source_parts = []

    if raw_criteria:
        source_parts.append(f"{len(raw_criteria)} criteri estratti dai documenti")
    else:
        req_criteria = _criteria_from_requirements(tender)
        if req_criteria:
            raw_criteria = req_criteria
            source_parts.append(f"{len(req_criteria)} requisiti tecnici usati come criteri")
        else:
            raw_criteria = DEFAULT_CRITERIA
            source_parts.append("template standard per categoria")

    if company:
        source_parts.append(f"personalizzato per {company.name}")

    criteria: list[GeneratedCriterion] = []
    for item in raw_criteria:
        criteria.append(
            {
                "id": _new_id(),
                "title": item["title"],
                "category": item["category"],
                "max_points": item.get("max_points"),
                "description": item.get("description", ""),
                "suggested_pages": 0,
            }
        )

    max_pages = _parse_max_pages(tender, combined_text)
    page_plan = _build_page_plan(criteria, max_pages)

    return {
        "criteria": criteria,
        "page_plan": page_plan,
        "formal_constraints": _formal_constraints_from_tender(tender),
        "source_summary": "; ".join(source_parts),
    }


def apply_outline_to_relation(
    relation: TechnicalRelation,
    outline: GeneratedOutline,
    *,
    preserve_section_content: bool = True,
) -> TechnicalRelation:
    existing_by_criterion = {}
    if preserve_section_content:
        for section in relation.sections:
            criterion_id = section.get("criterion_id")
            if criterion_id:
                existing_by_criterion[criterion_id] = section

    sections = []
    for criterion in outline["criteria"]:
        existing = existing_by_criterion.get(criterion["id"])
        if existing:
            sections.append(
                {
                    **existing,
                    "title": criterion["title"],
                    "category": criterion["category"],
                    "suggested_pages": criterion["suggested_pages"],
                    "order": next(
                        (
                            entry["order"]
                            for entry in outline["page_plan"]["entries"]
                            if entry["criterion_id"] == criterion["id"]
                        ),
                        existing.get("order", 1),
                    ),
                }
            )
        else:
            sections.append(
                {
                    "id": _new_id(),
                    "criterion_id": criterion["id"],
                    "title": criterion["title"],
                    "category": criterion["category"],
                    "content": "",
                    "order": next(
                        (
                            entry["order"]
                            for entry in outline["page_plan"]["entries"]
                            if entry["criterion_id"] == criterion["id"]
                        ),
                        len(sections) + 1,
                    ),
                    "suggested_pages": criterion["suggested_pages"],
                    "completed": False,
                }
            )

    relation.outline = outline
    relation.sections = sections
    relation.generated_at = timezone.now()
    relation.save(update_fields=["outline", "sections", "generated_at", "updated_at"])
    return relation


def get_or_create_technical_relation(tender: Tender) -> TechnicalRelation:
    relation, _ = TechnicalRelation.objects.get_or_create(
        tender=tender,
        defaults={"outline": default_technical_relation_outline()},
    )
    return relation
