"""Estrazione criteri di valutazione da disciplinari italiani (sez. 18.x)."""

from __future__ import annotations

import re
from decimal import Decimal

from ..models import EvaluationCriterion
from .criterion_extraction import ExtractedCriterion, _make_criterion, _parse_decimal, _sanitize_db_decimal

TOC_LINE_PATTERN = re.compile(r"\.{4,}\s*\d+\s*$")
CRITERIO_AGGIUDICAZIONE_HEADER = r"18\.\s*CRITERIO\s+DI\s+AGGIUDICAZIONE"
SECTION_END = r"\n\s*18\.2\.|\n\s*19\.|\n\s*27\.\s"
PUNTEGGIO_MASSIMO_PATTERN = re.compile(
    r"PUNTEGGIO\s+MASSIMO\s+(.*?)(?:\n\s*18\.1\.|\Z)",
    re.IGNORECASE | re.DOTALL,
)
ALLOCATION_LINE_PATTERN = re.compile(
    r"^(Offerta\s+tecnica|Offerta\s+economica)\s+(\d+(?:[.,]\d+)?)\s*$",
    re.IGNORECASE,
)
SOGLIA_SBARRAMENTO_PATTERN = re.compile(
    r"soglia\s+minima\s+di\s+sbarramento\s+pari\s+a\s+(\d+(?:[.,]\d+)?)\s+punt",
    re.IGNORECASE,
)
ALLEGATO_CRITERI_PATTERN = re.compile(
    r"[«\"'“]?\s*Criteri di valutazione delle offerte tecniche\s*[»\"'”]?",
    re.IGNORECASE,
)
INTRO_AGGIUDICAZIONE_PATTERN = re.compile(
    r"L[\u2019']appalto\s+è\s+aggiudicato.+?qualità/prezzo\.",
    re.IGNORECASE | re.DOTALL,
)
GRIGLIA_ROW_PATTERN = re.compile(
    r"^(.{8,100}?)\s+(\d+(?:[.,]\d+)?)\s+([DT])\s*$",
    re.IGNORECASE,
)


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


def _extract_allocations(body: str) -> dict[str, Decimal]:
    allocations: dict[str, Decimal] = {}
    match = PUNTEGGIO_MASSIMO_PATTERN.search(body)
    if not match:
        return allocations
    for line in match.group(1).splitlines():
        stripped = line.strip()
        if not stripped or TOC_LINE_PATTERN.search(stripped):
            continue
        if row := ALLOCATION_LINE_PATTERN.match(stripped):
            score = _parse_decimal(row.group(2))
            if score is not None:
                allocations[row.group(1).lower()] = score
    return allocations


def _extract_griglia_rows(body: str) -> list[tuple[str, Decimal, str]]:
    rows: list[tuple[str, Decimal, str]] = []
    seen: set[str] = set()
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or TOC_LINE_PATTERN.search(stripped):
            continue
        if re.search(r"\.{4,}", stripped):
            continue
        match = GRIGLIA_ROW_PATTERN.match(stripped)
        if not match:
            continue
        label = _normalize_whitespace(match.group(1))
        key = label.lower()[:80]
        if key in seen:
            continue
        seen.add(key)
        score = _parse_decimal(match.group(2))
        if score is None:
            continue
        rows.append((label, score, match.group(3).upper()))
    return rows


def parse_disciplinare_criteria(text: str, *, document_name: str = "") -> list[ExtractedCriterion]:
    body = _find_section_body(text, CRITERIO_AGGIUDICAZIONE_HEADER, SECTION_END)
    if not body.strip():
        return []

    allocations = _extract_allocations(body)
    if not allocations:
        return []

    criteria: list[ExtractedCriterion] = []
    ordine = 0
    soglia = ""
    if match := SOGLIA_SBARRAMENTO_PATTERN.search(body):
        soglia = f"{match.group(1)} punti"

    intro = ""
    if match := INTRO_AGGIUDICAZIONE_PATTERN.search(body):
        intro = _normalize_whitespace(match.group(0))

    has_allegato = bool(
        ALLEGATO_CRITERI_PATTERN.search(_normalize_whitespace(body))
        or re.search(
            r"allegato.{0,120}criteri di valutazione delle offerte tecniche",
            _normalize_whitespace(body),
            re.IGNORECASE,
        )
    )
    offerta_tecnica_ordine: int | None = None

    if score := allocations.get("offerta tecnica"):
        ordine += 1
        offerta_tecnica_ordine = ordine
        descrizione_parts = [intro] if intro else []
        if has_allegato:
            descrizione_parts.append(
                "Dettaglio nella griglia allegata «Criteri di valutazione delle offerte tecniche»."
            )
        criteria.append(
            _make_criterion(
                livello=EvaluationCriterion.Livello.CRITERIO,
                titolo="Offerta tecnica",
                descrizione=" ".join(part for part in descrizione_parts if part),
                context=body,
                document_name=document_name,
                ordine=ordine,
                extra_text=f"punteggio massimo {score}",
            )
        )
        criteria[-1]["punteggio_massimo"] = _sanitize_db_decimal(score)
        criteria[-1]["soglia_minima"] = soglia
        criteria[-1]["paragrafo_origine"] = "18.1"

    if score := allocations.get("offerta economica"):
        ordine += 1
        criteria.append(
            _make_criterion(
                livello=EvaluationCriterion.Livello.CRITERIO,
                titolo="Offerta economica",
                descrizione="",
                context=body,
                document_name=document_name,
                ordine=ordine,
                extra_text=f"punteggio massimo {score}",
            )
        )
        criteria[-1]["punteggio_massimo"] = _sanitize_db_decimal(score)
        criteria[-1]["soglia_minima"] = ""
        criteria[-1]["paragrafo_origine"] = "18"

    if offerta_tecnica_ordine is not None:
        for label, score, tipo in _extract_griglia_rows(body):
            ordine += 1
            punteggio_discrezionale = score if tipo == "D" else None
            punteggio_tabellare = score if tipo == "T" else None
            criteria.append(
                {
                    "livello": EvaluationCriterion.Livello.SUBCRITERIO,
                    "titolo": label[:500],
                    "descrizione": "",
                    "punteggio_massimo": _sanitize_db_decimal(score),
                    "punteggio_discrezionale": _sanitize_db_decimal(punteggio_discrezionale),
                    "punteggio_tabellare": _sanitize_db_decimal(punteggio_tabellare),
                    "soglia_minima": "",
                    "elementi_premianti": [],
                    "documento_origine": document_name,
                    "pagina_origine": "",
                    "paragrafo_origine": "18.1",
                    "ordine": ordine,
                    "parent_ordine": offerta_tecnica_ordine,
                }
            )

    return criteria
