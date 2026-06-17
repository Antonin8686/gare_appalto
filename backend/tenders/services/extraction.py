import re
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import TypedDict

from django.utils import timezone

from ..models import Document, Requirement, Tender, default_formal_rules

MONTHS_IT = {
    "gennaio": 1,
    "febbraio": 2,
    "marzo": 3,
    "aprile": 4,
    "maggio": 5,
    "giugno": 6,
    "luglio": 7,
    "agosto": 8,
    "settembre": 9,
    "ottobre": 10,
    "novembre": 11,
    "dicembre": 12,
}

CIG_PATTERN = re.compile(
    r"(?:CIG|cig)\s*[:\s]*([A-Z0-9]{10})\b",
    re.IGNORECASE,
)
CPV_PATTERN = re.compile(
    r"(?:CPV|cpv)\s*[:\s]*(\d{8})(?:-\d)?",
    re.IGNORECASE,
)
IMPORTO_PATTERN = re.compile(
    r"(?:importo|valore)\s*(?:stimato|base|della gara|complessivo)?"
    r"\s*[:\s]*€?\s*([\d][\d.\s]*(?:,\d{1,2})?)",
    re.IGNORECASE,
)
IMPORTO_EURO_PATTERN = re.compile(
    r"€\s*([\d][\d.\s]*(?:,\d{1,2})?)",
    re.IGNORECASE,
)
SCADENZA_NUMERIC_PATTERN = re.compile(
    r"(?:scadenza|termine\s+(?:per\s+)?(?:la\s+)?presentazione(?:\s+(?:delle\s+)?offerte)?)"
    r"\s*[:\s]*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})",
    re.IGNORECASE,
)
SCADENZA_TEXT_PATTERN = re.compile(
    r"(?:scadenza|termine\s+(?:per\s+)?(?:la\s+)?presentazione(?:\s+(?:delle\s+)?offerte)?)"
    r"\s*[:\s]*(\d{1,2})\s+(" + "|".join(MONTHS_IT.keys()) + r")\s+(\d{4})",
    re.IGNORECASE,
)
REQUISITO_PATTERN = re.compile(
    r"requisito\s+(obbligatorio|tecnico|economico)\s*[:\-]\s*"
    r"(.+?)(?:\s*[-–]\s*soglia\s*[:\-]\s*(.+?))?(?:\n|$)",
    re.IGNORECASE,
)
INLINE_REQUIREMENT_PATTERN = re.compile(
    r"(?:requisito|condizione)\s+(?:di\s+)?(partecipazione|generale|economico|tecnico|idoneit[aà])"
    r"\s*[:\-]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)
BULLET_REQUIREMENT_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:[-•*]|\d+[\.)])\s*((?:possesso|capacit[aà]|titolarit[aà]|iscrizione|certificaz)[^\n]{12,280})",
    re.IGNORECASE | re.MULTILINE,
)
FORMAL_RULE_PATTERN = re.compile(
    r"regola\s+formale\s+(pagine|font|margini|allegati)\s*[:\-]\s*"
    r"(.+?)(?:\n|$)",
    re.IGNORECASE,
)

FORMAL_RULE_CATEGORIES = ("pagine", "font", "margini", "allegati")


class ExtractedMetadata(TypedDict, total=False):
    cig: str
    cpv: str
    importo: Decimal
    scadenza: date


class ExtractedFormalRule(TypedDict):
    category: str
    label: str
    detail: str


def parse_importo(raw: str) -> Decimal | None:
    cleaned = raw.strip().replace(" ", "")
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    else:
        cleaned = cleaned.replace(".", "")
    try:
        value = Decimal(cleaned)
    except InvalidOperation:
        return None
    return value if value > 0 else None


def parse_numeric_date(raw: str) -> date | None:
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def extract_cig(text: str) -> str | None:
    match = CIG_PATTERN.search(text)
    if match:
        return match.group(1).upper()
    return None


def extract_cpv(text: str) -> str | None:
    match = CPV_PATTERN.search(text)
    if match:
        return match.group(1)
    return None


def extract_importo(text: str) -> Decimal | None:
    for pattern in (IMPORTO_PATTERN, IMPORTO_EURO_PATTERN):
        match = pattern.search(text)
        if match:
            value = parse_importo(match.group(1))
            if value is not None:
                return value
    return None


def extract_scadenza(text: str) -> date | None:
    match = SCADENZA_NUMERIC_PATTERN.search(text)
    if match:
        return parse_numeric_date(match.group(1))

    match = SCADENZA_TEXT_PATTERN.search(text)
    if match:
        day = int(match.group(1))
        month = MONTHS_IT[match.group(2).lower()]
        year = int(match.group(3))
        try:
            return date(year, month, day)
        except ValueError:
            return None
    return None


def parse_tender_metadata(text: str) -> ExtractedMetadata:
    metadata: ExtractedMetadata = {}
    if cig := extract_cig(text):
        metadata["cig"] = cig
    if cpv := extract_cpv(text):
        metadata["cpv"] = cpv
    if importo := extract_importo(text):
        metadata["importo"] = importo
    if scadenza := extract_scadenza(text):
        metadata["scadenza"] = scadenza
    return metadata


def apply_metadata_to_tender(tender: Tender, metadata: ExtractedMetadata) -> list[str]:
    update_fields: list[str] = []

    if cig := metadata.get("cig"):
        tender.cig = cig[:10]
        update_fields.append("cig")
    if cpv := metadata.get("cpv"):
        tender.cpv = cpv[:8]
        update_fields.append("cpv")
    if importo := metadata.get("importo"):
        tender.importo = importo
        update_fields.append("importo")
    if scadenza := metadata.get("scadenza"):
        tender.scadenza = scadenza
        update_fields.append("scadenza")

    if update_fields:
        tender.ai_extracted = True
        tender.extracted_at = timezone.now()
        update_fields.extend(["ai_extracted", "extracted_at", "updated_at"])
        tender.save(update_fields=update_fields)

    return update_fields


def _map_inline_tipo(raw: str) -> str:
    lowered = raw.lower()
    if "econom" in lowered:
        return Requirement.Tipo.ECONOMICO
    if "tecn" in lowered or "idoneit" in lowered:
        return Requirement.Tipo.TECNICO
    return Requirement.Tipo.OBBLIGATORIO


def parse_requirements(text: str, *, document_name: str = "") -> list:
    from .requirement_extraction import ExtractedRequirement, enrich_requirement

    seen: set[str] = set()
    requirements: list[ExtractedRequirement] = []

    def add_requirement(
        descrizione: str,
        tipo: str,
        soglia: str = "",
        context: str = "",
    ) -> None:
        key = descrizione.strip().lower()[:120]
        if not key or key in seen:
            return
        seen.add(key)
        requirements.append(
            enrich_requirement(
                descrizione=descrizione,
                tipo=tipo,
                soglia=soglia,
                document_name=document_name,
                context=context or descrizione,
            )
        )

    for match in REQUISITO_PATTERN.finditer(text):
        tipo = match.group(1).lower()
        descrizione = match.group(2).strip()
        soglia = (match.group(3) or "").strip()
        add_requirement(descrizione, tipo, soglia, match.group(0))

    for match in INLINE_REQUIREMENT_PATTERN.finditer(text):
        tipo = _map_inline_tipo(match.group(1))
        descrizione = match.group(2).strip()
        add_requirement(descrizione, tipo, context=match.group(0))

    for match in BULLET_REQUIREMENT_PATTERN.finditer(text):
        descrizione = match.group(1).strip()
        lowered = descrizione.lower()
        if "fatturato" in lowered or "patrimonio" in lowered:
            tipo = Requirement.Tipo.ECONOMICO
        elif any(word in lowered for word in ("esperienz", "serviz", "personale")):
            tipo = Requirement.Tipo.TECNICO
        else:
            tipo = Requirement.Tipo.OBBLIGATORIO
        add_requirement(descrizione, tipo, context=match.group(0))

    return requirements


def save_requirements_for_document(
    tender: Tender,
    document: Document,
    requirements: list,
) -> int:
    Requirement.objects.filter(document=document).delete()
    if not requirements:
        return 0

    document_name = document.name or document.original_filename
    objects = []
    for item in requirements:
        if not item.get("documento_origine"):
            item = {**item, "documento_origine": document_name}
        objects.append(
            Requirement(
                tender=tender,
                document=document,
                tipo=item["tipo"],
                categoria=item.get("categoria", Requirement.Categoria.GENERALE),
                descrizione=item["descrizione"],
                soglia=item.get("soglia", ""),
                soglia_minima=item.get("soglia_minima", item.get("soglia", "")),
                obbligatorio=item.get("obbligatorio", True),
                premiante=item.get("premiante", False),
                migliorativo=item.get("migliorativo", False),
                documento_origine=item.get("documento_origine", document_name),
                pagina_origine=item.get("pagina_origine", ""),
                paragrafo_origine=item.get("paragrafo_origine", ""),
                modalita_comprova=item.get("modalita_comprova", ""),
                soggetto_obbligato=item.get("soggetto_obbligato", ""),
                avvalimento_consentito=item.get("avvalimento_consentito", False),
                rti_consentito=item.get("rti_consentito", False),
                consorzio_consentito=item.get("consorzio_consentito", False),
                note_interpretative=item.get("note_interpretative", ""),
            )
        )

    Requirement.objects.bulk_create(objects)
    return len(objects)


def parse_formal_rules(text: str) -> list[ExtractedFormalRule]:
    rules: list[ExtractedFormalRule] = []
    for match in FORMAL_RULE_PATTERN.finditer(text):
        category = match.group(1).lower()
        full_text = match.group(2).strip()
        if not full_text:
            continue

        if " - " in full_text:
            label, detail = full_text.split(" - ", 1)
            label = label.strip()
            detail = detail.strip()
        else:
            label = full_text
            detail = ""

        rules.append(
            {
                "category": category,
                "label": label,
                "detail": detail,
            }
        )
    return rules


def merge_formal_rules(
    existing: dict | None,
    extracted: list[ExtractedFormalRule],
) -> dict:
    merged = default_formal_rules()
    source = existing if isinstance(existing, dict) else {}

    for category in FORMAL_RULE_CATEGORIES:
        current_items = source.get(category, [])
        if isinstance(current_items, list):
            merged[category] = list(current_items)

    for item in extracted:
        category = item["category"]
        if category not in FORMAL_RULE_CATEGORIES:
            continue

        label = item["label"]
        if any(existing_item.get("label") == label for existing_item in merged[category]):
            continue

        merged[category].append(
            {
                "id": uuid.uuid4().hex,
                "label": label,
                "detail": item["detail"],
                "checked": False,
            }
        )

    return merged


def apply_formal_rules_to_tender(
    tender: Tender,
    extracted: list[ExtractedFormalRule],
) -> bool:
    if not extracted:
        return False

    tender.formal_rules = merge_formal_rules(tender.formal_rules, extracted)
    tender.save(update_fields=["formal_rules", "updated_at"])
    return True
