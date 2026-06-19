import re
from decimal import Decimal, InvalidOperation
from typing import Any, TypedDict

from ..models import EvaluationCriterion

PAGINA_PATTERN = re.compile(
    r"(?:pag(?:ina|\.)?|p\.)\s*(\d{1,4})",
    re.IGNORECASE,
)
PARAGRAFO_PATTERN = re.compile(
    r"(?:art(?:icolo)?\.?|comma|§)\s*(\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
GRIGLIA_SECTION_PATTERN = re.compile(
    r"(?:griglia\s+(?:di\s+)?valutazione|criteri\s+di\s+(?:valutazione|aggiudicazione))",
    re.IGNORECASE,
)
CRITERIO_LINE_PATTERN = re.compile(
    r"^(?:criterio|criteri)\s+(?:di\s+)?(?:valutazione\s+)?(?:tecnico|tecnica|economico|economica)?"
    r"\s*(?:n\.?\s*)?(\d+[\.\)]?)?\s*[:\-\.]?\s*(.+)$",
    re.IGNORECASE,
)
SUBCRITERIO_LINE_PATTERN = re.compile(
    r"^(?:sub[\-\s]?criterio)\s*(?:n\.?\s*)?(\d+[\.\)]?)?\s*[:\-\.]?\s*(.+)$",
    re.IGNORECASE,
)
MICROCRITERIO_LINE_PATTERN = re.compile(
    r"^(?:micro[\-\s]?criterio)\s*(?:n\.?\s*)?(\d+[\.\)]?)?\s*[:\-\.]?\s*(.+)$",
    re.IGNORECASE,
)
NUMBERED_CRITERION_PATTERN = re.compile(
    r"^(?:[-•*]|\d+[\.)])\s*((?:criterio|organizzazione|metodologia|personale|qualit|esperienz|offerta)[^\n]{8,240})$",
    re.IGNORECASE,
)
PUNTEGGIO_MAX_PATTERN = re.compile(
    r"(?:punteggio|pt\.?|punti)\s*(?:max(?:imo)?|massimo)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)",
    re.IGNORECASE,
)
DISCREZIONALE_PATTERN = re.compile(
    r"punteggio\s+discrezionale\s*[:\-]?\s*(\d+(?:[.,]\d+)?)",
    re.IGNORECASE,
)
TABELLARE_PATTERN = re.compile(
    r"punteggio\s+tabellare\s*[:\-]?\s*(\d+(?:[.,]\d+)?)",
    re.IGNORECASE,
)
SOGLIA_MINIMA_PATTERN = re.compile(
    r"soglia\s+minima\s*[:\-]?\s*(.+?)(?:\.|;|\n|$)",
    re.IGNORECASE,
)
PREMIANTE_PATTERN = re.compile(
    r"(?:elemento\s+)?premiant\w*\s*[:\-]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)
TABLE_ROW_PATTERN = re.compile(
    r"^(.{8,120}?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)?\s*$",
)
TOC_LINE_PATTERN = re.compile(r"\.{4,}\s*\d+\s*$")


class ExtractedCriterion(TypedDict, total=False):
    livello: str
    titolo: str
    descrizione: str
    punteggio_massimo: Decimal | None
    punteggio_discrezionale: Decimal | None
    punteggio_tabellare: Decimal | None
    soglia_minima: str
    elementi_premianti: list[str]
    documento_origine: str
    pagina_origine: str
    paragrafo_origine: str
    ordine: int
    parent_ordine: int | None


MAX_CRITERION_SCORE = Decimal("99999.99")
DB_DECIMAL_MAX = Decimal("999999.99")


def _parse_decimal(raw: str | None) -> Decimal | None:
    if not raw:
        return None
    cleaned = raw.strip().replace(",", ".")
    try:
        value = Decimal(cleaned)
    except InvalidOperation:
        return None
    if value < 0 or value > MAX_CRITERION_SCORE:
        return None
    return value


def _sanitize_db_decimal(value: Decimal | None) -> Decimal | None:
    """Evita overflow su DecimalField(max_digits=8, decimal_places=2)."""
    if value is None:
        return None
    if value < 0 or value > DB_DECIMAL_MAX:
        return None
    return value.quantize(Decimal("0.01"))


def _is_toc_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if TOC_LINE_PATTERN.search(stripped):
        return True
    return bool(re.search(r"\.{4,}", stripped))


def _is_plausible_evaluation_table_row(label: str, line: str) -> bool:
    if _is_toc_line(line) or re.search(r"\.{4,}", label):
        return False
    combined = f"{label} {line}".lower()
    reject_markers = (
        "telefono",
        "telefax",
        "fax",
        "email",
        "pec",
        "sede legale",
        "via ",
        "p.iva",
        "partita iva",
        "codice fiscale",
        "cap ",
        "protocollo@",
    )
    return not any(marker in combined for marker in reject_markers)


def _extract_page_paragraph(context: str) -> tuple[str, str]:
    pagina = ""
    paragrafo = ""
    if match := PAGINA_PATTERN.search(context):
        pagina = match.group(1)
    if match := PARAGRAFO_PATTERN.search(context):
        paragrafo = match.group(1)
    return pagina, paragrafo


def _extract_scores(text: str) -> dict[str, Decimal | None]:
    scores = {
        "punteggio_massimo": None,
        "punteggio_discrezionale": None,
        "punteggio_tabellare": None,
    }
    if match := PUNTEGGIO_MAX_PATTERN.search(text):
        scores["punteggio_massimo"] = _parse_decimal(match.group(1))
    if match := DISCREZIONALE_PATTERN.search(text):
        scores["punteggio_discrezionale"] = _parse_decimal(match.group(1))
    if match := TABELLARE_PATTERN.search(text):
        scores["punteggio_tabellare"] = _parse_decimal(match.group(1))
    return scores


def _extract_premianti(text: str) -> list[str]:
    return [match.group(1).strip() for match in PREMIANTE_PATTERN.finditer(text) if match.group(1).strip()]


def _split_title_description(body: str) -> tuple[str, str]:
    body = body.strip()
    if " - " in body:
        title, desc = body.split(" - ", 1)
        return title.strip(), desc.strip()
    if ". " in body and len(body) > 80:
        title, desc = body.split(". ", 1)
        return title.strip(), desc.strip()
    return body, ""


def _make_criterion(
    *,
    livello: str,
    titolo: str,
    descrizione: str,
    context: str,
    document_name: str,
    ordine: int,
    parent_ordine: int | None = None,
    extra_text: str = "",
) -> ExtractedCriterion:
    combined = f"{titolo} {descrizione} {extra_text} {context}"
    scores = _extract_scores(combined)
    pagina, paragrafo = _extract_page_paragraph(context)
    soglia = ""
    if match := SOGLIA_MINIMA_PATTERN.search(combined):
        soglia = match.group(1).strip()

    if scores["punteggio_massimo"] is None:
        trailing = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:pt|punti)\s*$", titolo, re.IGNORECASE)
        if trailing:
            scores["punteggio_massimo"] = _parse_decimal(trailing.group(1))
            titolo = titolo[: trailing.start()].strip(" -–:")

    return {
        "livello": livello,
        "titolo": titolo[:500],
        "descrizione": descrizione,
        "punteggio_massimo": _sanitize_db_decimal(scores["punteggio_massimo"]),
        "punteggio_discrezionale": _sanitize_db_decimal(scores["punteggio_discrezionale"]),
        "punteggio_tabellare": _sanitize_db_decimal(scores["punteggio_tabellare"]),
        "soglia_minima": soglia,
        "elementi_premianti": _extract_premianti(combined),
        "documento_origine": document_name,
        "pagina_origine": pagina,
        "paragrafo_origine": paragrafo,
        "ordine": ordine,
        "parent_ordine": parent_ordine,
    }


def parse_evaluation_criteria(text: str, *, document_name: str = "") -> list[ExtractedCriterion]:
    if not text.strip():
        return []

    from .disciplinare_criterion_extraction import parse_disciplinare_criteria

    disciplinare = parse_disciplinare_criteria(text, document_name=document_name)
    if disciplinare:
        return disciplinare

    criteria: list[ExtractedCriterion] = []
    seen: set[str] = set()
    ordine = 0
    current_criterio_ordine: int | None = None
    current_subcriterio_ordine: int | None = None
    in_griglia = False
    context_buffer = ""

    lines = text.splitlines()
    for index, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line or _is_toc_line(line):
            continue

        context_buffer = "\n".join(lines[max(0, index - 2) : index + 2])

        if GRIGLIA_SECTION_PATTERN.search(line) and not _is_toc_line(line):
            in_griglia = True
            continue

        matched = False

        for pattern, livello, parent_getter in (
            (CRITERIO_LINE_PATTERN, EvaluationCriterion.Livello.CRITERIO, lambda: None),
            (SUBCRITERIO_LINE_PATTERN, EvaluationCriterion.Livello.SUBCRITERIO, lambda: current_criterio_ordine),
            (MICROCRITERIO_LINE_PATTERN, EvaluationCriterion.Livello.MICROCRITERIO, lambda: current_subcriterio_ordine or current_criterio_ordine),
        ):
            if match := pattern.match(line):
                body = match.group(2).strip()
                titolo, descrizione = _split_title_description(body)
                key = f"{livello}:{titolo.lower()[:80]}"
                if key in seen:
                    matched = True
                    break
                seen.add(key)
                ordine += 1
                item = _make_criterion(
                    livello=livello,
                    titolo=titolo,
                    descrizione=descrizione,
                    context=context_buffer,
                    document_name=document_name,
                    ordine=ordine,
                    parent_ordine=parent_getter(),
                )
                criteria.append(item)
                if livello == EvaluationCriterion.Livello.CRITERIO:
                    current_criterio_ordine = ordine
                    current_subcriterio_ordine = None
                elif livello == EvaluationCriterion.Livello.SUBCRITERIO:
                    current_subcriterio_ordine = ordine
                matched = True
                break

        if matched:
            continue

        if in_griglia and (table_match := TABLE_ROW_PATTERN.match(line)):
            label = table_match.group(1).strip()
            if not _is_plausible_evaluation_table_row(label, line):
                continue
            max_score = _parse_decimal(table_match.group(2))
            tab_score = _parse_decimal(table_match.group(3)) if table_match.group(3) else None
            key = f"tabellare:{label.lower()[:80]}"
            if key in seen:
                continue
            seen.add(key)
            ordine += 1
            parent_ordine = current_subcriterio_ordine or current_criterio_ordine
            livello = (
                EvaluationCriterion.Livello.MICROCRITERIO
                if parent_ordine
                else EvaluationCriterion.Livello.CRITERIO
            )
            criteria.append(
                {
                    "livello": livello,
                    "titolo": label[:500],
                    "descrizione": f"Riga griglia di valutazione: {label}",
                    "punteggio_massimo": _sanitize_db_decimal(max_score),
                    "punteggio_discrezionale": None,
                    "punteggio_tabellare": _sanitize_db_decimal(tab_score or max_score),
                    "soglia_minima": "",
                    "elementi_premianti": [],
                    "documento_origine": document_name,
                    "pagina_origine": _extract_page_paragraph(context_buffer)[0],
                    "paragrafo_origine": _extract_page_paragraph(context_buffer)[1],
                    "ordine": ordine,
                    "parent_ordine": parent_ordine,
                }
            )
            continue

        if match := NUMBERED_CRITERION_PATTERN.match(line):
            body = match.group(1).strip()
            titolo, descrizione = _split_title_description(body)
            key = f"criterio:{titolo.lower()[:80]}"
            if key in seen:
                continue
            seen.add(key)
            ordine += 1
            item = _make_criterion(
                livello=EvaluationCriterion.Livello.CRITERIO,
                titolo=titolo,
                descrizione=descrizione,
                context=context_buffer,
                document_name=document_name,
                ordine=ordine,
            )
            criteria.append(item)
            current_criterio_ordine = ordine
            current_subcriterio_ordine = None

    if not criteria:
        for match in re.finditer(
            r"criterio\s+(?:di\s+)?valutazione\s*[:\-]\s*(.+?)(?:\n|$)",
            text,
            re.IGNORECASE,
        ):
            titolo, descrizione = _split_title_description(match.group(1).strip())
            key = f"fallback:{titolo.lower()[:80]}"
            if key in seen:
                continue
            seen.add(key)
            ordine += 1
            criteria.append(
                _make_criterion(
                    livello=EvaluationCriterion.Livello.CRITERIO,
                    titolo=titolo,
                    descrizione=descrizione,
                    context=match.group(0),
                    document_name=document_name,
                    ordine=ordine,
                )
            )

    return criteria


def save_evaluation_criteria_for_document(tender, document, extracted: list[ExtractedCriterion]) -> int:
    from ..models import EvaluationCriterion as EC

    EC.objects.filter(document=document).delete()
    if not extracted:
        return 0

    document_name = document.name or document.original_filename
    ordine_to_obj: dict[int, EC] = {}

    for item in extracted:
        parent = None
        parent_ordine = item.get("parent_ordine")
        if parent_ordine is not None:
            parent = ordine_to_obj.get(parent_ordine)

        obj = EC.objects.create(
            tender=tender,
            document=document,
            parent=parent,
            livello=item["livello"],
            titolo=item["titolo"],
            descrizione=item.get("descrizione", ""),
            punteggio_massimo=_sanitize_db_decimal(item.get("punteggio_massimo")),
            punteggio_discrezionale=_sanitize_db_decimal(item.get("punteggio_discrezionale")),
            punteggio_tabellare=_sanitize_db_decimal(item.get("punteggio_tabellare")),
            soglia_minima=item.get("soglia_minima", ""),
            elementi_premianti=item.get("elementi_premianti", []),
            documento_origine=item.get("documento_origine", document_name),
            pagina_origine=item.get("pagina_origine", ""),
            paragrafo_origine=item.get("paragrafo_origine", ""),
            ordine=item.get("ordine", 0),
        )
        ordine_to_obj[item["ordine"]] = obj

    return len(ordine_to_obj)


def build_criteria_tree(criteria: list) -> list[dict[str, Any]]:
    by_parent: dict[int | None, list] = {}
    for criterion in criteria:
        by_parent.setdefault(criterion.parent_id, []).append(criterion)

    def serialize_node(node) -> dict[str, Any]:
        children = by_parent.get(node.id, [])
        return {
            "id": node.id,
            "livello": node.livello,
            "livello_label": node.get_livello_display(),
            "titolo": node.titolo,
            "descrizione": node.descrizione,
            "punteggio_massimo": str(node.punteggio_massimo) if node.punteggio_massimo is not None else None,
            "punteggio_discrezionale": (
                str(node.punteggio_discrezionale) if node.punteggio_discrezionale is not None else None
            ),
            "punteggio_tabellare": (
                str(node.punteggio_tabellare) if node.punteggio_tabellare is not None else None
            ),
            "soglia_minima": node.soglia_minima,
            "elementi_premianti": node.elementi_premianti,
            "document_id": node.document_id,
            "document_name": (
                node.document.name or node.document.original_filename if node.document_id else node.documento_origine
            ),
            "documento_origine": node.documento_origine,
            "pagina_origine": node.pagina_origine,
            "paragrafo_origine": node.paragrafo_origine,
            "ordine": node.ordine,
            "children": [serialize_node(child) for child in children],
        }

    roots = by_parent.get(None, [])
    return [serialize_node(root) for root in roots]


def criteria_tree_summary(tree: list[dict[str, Any]]) -> dict[str, Any]:
    def walk(nodes: list[dict[str, Any]]) -> tuple[int, Decimal, int]:
        count = 0
        total = Decimal("0")
        premianti = 0
        for node in nodes:
            count += 1
            if node.get("punteggio_massimo"):
                total += Decimal(node["punteggio_massimo"])
            premianti += len(node.get("elementi_premianti") or [])
            child_count, child_total, child_prem = walk(node.get("children", []))
            count += child_count
            total += child_total
            premianti += child_prem
        return count, total, premianti

    count, total, premianti = walk(tree)
    return {
        "criteri_count": count,
        "punteggio_totale": str(total) if total else None,
        "elementi_premianti_count": premianti,
    }
