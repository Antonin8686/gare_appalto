"""Estrazione requisiti da disciplinari italiani (sezioni 5–6.x e correlate)."""

from __future__ import annotations

import re

from ..models import Requirement

LETTER_ITEM_PATTERN = re.compile(
    r"(?:^|\n)\s*([a-z])\)\s+(.+?)(?=\n\s*[a-z]\)\s|\n\s*\d+\.\d+\.|\n\s*Pag\.\s+\d|\Z)",
    re.IGNORECASE | re.DOTALL,
)
TOC_LINE_PATTERN = re.compile(r"\.{4,}\s*\d+\s*$")
NO_REQUIREMENTS_PATTERN = re.compile(
    r"non\s+sono\s+richiesti\s+requisiti[^.\n]{0,120}\.",
    re.IGNORECASE,
)
SUBSTANTIVE_PARAGRAPH_PATTERN = re.compile(
    r"(?:^|\n)\s*((?:Sono esclusi|I concorrenti devono|Gli operatori|L['']operatore|"
    r"È richiesto|È necessario|Il concorrente deve|devono possedere|a pena di esclusione)"
    r"[^\n]+(?:\n(?!\n|\s*\d+\.|\s*Pag\.)[^\n]+)*)",
    re.IGNORECASE,
)

SECTION_SPECS: tuple[dict[str, str | bool], ...] = (
    {
        "header": r"5\.\s*REQUISITI\s+DI\s+ORDINE\s+GENERALE",
        "end": r"\n\s*6\.\s*REQUISITI\s+DI\s+ORDINE\s+SPECIALE",
        "tipo": Requirement.Tipo.OBBLIGATORIO,
        "categoria": Requirement.Categoria.GENERALE,
        "label": "5",
        "lettered": False,
    },
    {
        "header": r"6\.\s*REQUISITI\s+DI\s+ORDINE\s+SPECIALE",
        "end": r"\n\s*6\.1\.\s*REQUISITI",
        "tipo": Requirement.Tipo.OBBLIGATORIO,
        "categoria": Requirement.Categoria.GENERALE,
        "label": "6",
        "lettered": False,
    },
    {
        "header": r"6\.1\.\s*REQUISITI\s+DI\s+IDONEIT",
        "end": r"\n\s*6\.2\.\s*REQUISITI",
        "tipo": Requirement.Tipo.OBBLIGATORIO,
        "categoria": Requirement.Categoria.IDONEITA_PROFESSIONALE,
        "label": "6.1",
        "lettered": True,
    },
    {
        "header": r"6\.2\.\s*REQUISITI\s+DI\s+CAPACIT[AÀ]\s+ECONOMICA",
        "end": r"\n\s*6\.3\.\s*REQUISITI",
        "tipo": Requirement.Tipo.ECONOMICO,
        "categoria": Requirement.Categoria.ECONOMICO_FINANZIARIO,
        "label": "6.2",
        "lettered": True,
    },
    {
        "header": r"6\.3\.\s*REQUISITI\s+DI\s+CAPACIT[AÀ]\s+TECNICA",
        "end": r"\n\s*6\.4\.\s*",
        "tipo": Requirement.Tipo.TECNICO,
        "categoria": Requirement.Categoria.TECNICO_PROFESSIONALE,
        "label": "6.3",
        "lettered": True,
    },
    {
        "header": r"9\.\s*REQUISITI\s+DI\s+PARTECIPAZIONE",
        "end": r"\n\s*10\.\s*GARANZIA",
        "tipo": Requirement.Tipo.OBBLIGATORIO,
        "categoria": Requirement.Categoria.GENERALE,
        "label": "9",
        "lettered": True,
    },
    {
        "header": r"10\.\s*GARANZIA\s+PROVVISORIA",
        "end": r"\n\s*11\.\s*SOPRALLUOGO",
        "tipo": Requirement.Tipo.OBBLIGATORIO,
        "categoria": Requirement.Categoria.GENERALE,
        "label": "10",
        "lettered": False,
    },
)


class RawRequirement:
    __slots__ = ("descrizione", "tipo", "categoria", "paragrafo_origine", "context")

    def __init__(
        self,
        *,
        descrizione: str,
        tipo: str,
        categoria: str,
        paragrafo_origine: str = "",
        context: str = "",
    ) -> None:
        self.descrizione = descrizione
        self.tipo = tipo
        self.categoria = categoria
        self.paragrafo_origine = paragrafo_origine
        self.context = context or descrizione


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _is_toc_snippet(body: str) -> bool:
    stripped = body.strip()
    if len(stripped) < 80:
        return True
    first_lines = stripped.splitlines()[:3]
    if first_lines and all(TOC_LINE_PATTERN.search(line) for line in first_lines if line.strip()):
        return True
    if re.search(r"\.{5,}", stripped[:250]):
        return True
    return False


def _find_section_body(text: str, header: str, end: str) -> str:
    header_re = re.compile(header, re.IGNORECASE)
    end_re = re.compile(end, re.IGNORECASE)
    best = ""
    for match in header_re.finditer(text):
        start = match.end()
        end_match = end_re.search(text, start)
        body = text[start : end_match.start() if end_match else start + 12000]
        if _is_toc_snippet(body):
            continue
        if len(body.strip()) > len(best.strip()):
            best = body
    return best


def _extract_lettered_items(body: str, *, label: str, tipo: str, categoria: str) -> list[RawRequirement]:
    items: list[RawRequirement] = []
    for match in LETTER_ITEM_PATTERN.finditer(body):
        letter = match.group(1).lower()
        descrizione = _normalize_whitespace(match.group(2))
        if len(descrizione) < 25:
            continue
        items.append(
            RawRequirement(
                descrizione=descrizione,
                tipo=tipo,
                categoria=categoria,
                paragrafo_origine=f"{label}.{letter})",
                context=match.group(0),
            )
        )
    return items


def _extract_substantive_paragraphs(
    body: str,
    *,
    label: str,
    tipo: str,
    categoria: str,
) -> list[RawRequirement]:
    items: list[RawRequirement] = []
    for match in SUBSTANTIVE_PARAGRAPH_PATTERN.finditer(body):
        descrizione = _normalize_whitespace(match.group(1))
        if len(descrizione) < 60:
            continue
        if TOC_LINE_PATTERN.search(descrizione):
            continue
        items.append(
            RawRequirement(
                descrizione=descrizione,
                tipo=tipo,
                categoria=categoria,
                paragrafo_origine=label,
                context=match.group(0),
            )
        )
    return items


def _extract_no_requirements_statement(
    body: str,
    *,
    label: str,
    tipo: str,
    categoria: str,
) -> RawRequirement | None:
    match = NO_REQUIREMENTS_PATTERN.search(body)
    if not match:
        return None
    descrizione = _normalize_whitespace(match.group(0))
    return RawRequirement(
        descrizione=descrizione,
        tipo=tipo,
        categoria=categoria,
        paragrafo_origine=label,
        context=match.group(0),
    )


def parse_disciplinare_requirements(text: str) -> list[RawRequirement]:
    if not text.strip():
        return []

    requirements: list[RawRequirement] = []
    seen: set[str] = set()

    def add_item(item: RawRequirement) -> None:
        key = item.descrizione.lower()[:140]
        if not key or key in seen:
            return
        seen.add(key)
        requirements.append(item)

    for spec in SECTION_SPECS:
        body = _find_section_body(text, spec["header"], spec["end"])
        if not body.strip():
            continue

        lettered = (
            _extract_lettered_items(
                body,
                label=spec["label"],
                tipo=spec["tipo"],
                categoria=spec["categoria"],
            )
            if spec.get("lettered", True)
            else []
        )
        if lettered:
            for item in lettered:
                add_item(item)
            continue

        if no_req := _extract_no_requirements_statement(
            body,
            label=spec["label"],
            tipo=spec["tipo"],
            categoria=spec["categoria"],
        ):
            add_item(no_req)
            continue

        for item in _extract_substantive_paragraphs(
            body,
            label=spec["label"],
            tipo=spec["tipo"],
            categoria=spec["categoria"],
        ):
            add_item(item)

    return requirements
