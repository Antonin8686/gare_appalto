"""Import bulk di offerte tecniche da PDF/DOCX nella libreria."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any

from tenders.services.ocr import extract_text_from_bytes

from ..models import TechnicalOffer

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MIN_SECTION_CHARS = 180
HEADING_LINE_PATTERN = re.compile(
    r"^\s*(?:#{1,3}\s+|\d+(?:\.\d+)*\.?\s+)([A-ZÀ-Úa-zà-ú0-9][^\n]{4,120})\s*$",
    re.MULTILINE,
)

CATEGORY_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("organizzazione", TechnicalOffer.Category.ORGANIZZAZIONE),
    ("metodologia", TechnicalOffer.Category.METODOLOGIA),
    ("personale", TechnicalOffer.Category.PERSONALE),
    ("formazione", TechnicalOffer.Category.PERSONALE),
    ("attrezzatur", TechnicalOffer.Category.ATTREZZATURE),
    ("mezzi", TechnicalOffer.Category.ATTREZZATURE),
    ("sicurezza", TechnicalOffer.Category.SICUREZZA),
    ("ambiente", TechnicalOffer.Category.AMBIENTE),
    ("sostenibil", TechnicalOffer.Category.AMBIENTE),
    ("qualit", TechnicalOffer.Category.QUALITA),
    ("certificaz", TechnicalOffer.Category.QUALITA),
)

SETTORE_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("puliz", TechnicalOffer.Settore.PULIZIE),
    ("sanific", TechnicalOffer.Settore.PULIZIE),
    ("verde", TechnicalOffer.Settore.VERDE),
    ("parco", TechnicalOffer.Settore.VERDE),
    ("manutenz", TechnicalOffer.Settore.MANUTENZIONE),
    ("facility", TechnicalOffer.Settore.FACILITY),
    ("software", TechnicalOffer.Settore.IT),
    ("ict", TechnicalOffer.Settore.IT),
    ("consulenz", TechnicalOffer.Settore.CONSULENZA),
    ("trasport", TechnicalOffer.Settore.TRASPORTI),
    ("logistic", TechnicalOffer.Settore.TRASPORTI),
    ("sanit", TechnicalOffer.Settore.SANITA),
    ("cultur", TechnicalOffer.Settore.CULTURA),
    ("eventi", TechnicalOffer.Settore.CULTURA),
)


@dataclass
class ImportDefaults:
    category: str = TechnicalOffer.Category.ALTRO
    settore: str = ""
    ente_appaltante: str = ""
    anno: int | None = None
    split_mode: str = "auto"  # auto | single | by_heading
    tags: list[str] = field(default_factory=list)


@dataclass
class ImportFileResult:
    filename: str
    created: list[TechnicalOffer] = field(default_factory=list)
    error: str = ""


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _title_from_filename(filename: str) -> str:
    stem = os.path.splitext(os.path.basename(filename))[0]
    cleaned = re.sub(r"[_\-]+", " ", stem)
    return _normalize_whitespace(cleaned) or "Offerta tecnica importata"


def infer_category(*, text: str, title: str, fallback: str) -> str:
    combined = f"{title} {text[:1200]}".lower()
    for keyword, category in CATEGORY_KEYWORDS:
        if keyword in combined:
            return category
    return fallback or TechnicalOffer.Category.ALTRO


def infer_settore(*, text: str, title: str, fallback: str) -> str:
    combined = f"{title} {text[:1200]}".lower()
    for keyword, settore in SETTORE_KEYWORDS:
        if keyword in combined:
            return settore
    return fallback


def _extract_year(text: str, filename: str) -> int | None:
    for source in (filename, text[:500]):
        match = re.search(r"(20\d{2}|19\d{2})", source)
        if match:
            year = int(match.group(1))
            if 1990 <= year <= 2100:
                return year
    return None


def split_text_into_sections(text: str) -> list[tuple[str, str]]:
    matches = list(HEADING_LINE_PATTERN.finditer(text))
    if len(matches) < 2:
        return []

    sections: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        title = _normalize_whitespace(match.group(1))
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if len(body) < MIN_SECTION_CHARS:
            continue
        sections.append((title, body))
    return sections


def _build_offer_payloads(
    *,
    filename: str,
    text: str,
    defaults: ImportDefaults,
) -> list[dict[str, Any]]:
    if not text.strip():
        return []

    file_title = _title_from_filename(filename)
    split_mode = defaults.split_mode
    sections: list[tuple[str, str]] = []

    if split_mode == "single":
        sections = [(file_title, text.strip())]
    else:
        sections = split_text_into_sections(text)
        if split_mode == "auto" and len(sections) < 2:
            sections = [(file_title, text.strip())]

    if not sections:
        sections = [(file_title, text.strip())]

    anno = defaults.anno or _extract_year(text, filename)
    payloads: list[dict[str, Any]] = []

    for title, body in sections:
        category = infer_category(text=body, title=title, fallback=defaults.category)
        settore = infer_settore(text=body, title=title, fallback=defaults.settore)
        tags = list(dict.fromkeys([*defaults.tags, os.path.basename(filename)]))
        payloads.append(
            {
                "title": title[:255],
                "category": category,
                "settore": settore,
                "ente_appaltante": defaults.ente_appaltante,
                "anno": anno,
                "content": body.strip(),
                "tags": tags,
                "parole_chiave": [word for word in re.findall(r"[a-zà-ù]{5,}", title.lower())[:6]],
                "riutilizzabilita": 4,
                "innovativita": 3,
            }
        )
    return payloads


def import_files(
    *,
    files: list[Any],
    owner,
    organization,
    defaults: ImportDefaults | None = None,
) -> list[ImportFileResult]:
    defaults = defaults or ImportDefaults()
    results: list[ImportFileResult] = []

    for uploaded in files:
        filename = getattr(uploaded, "name", "documento")
        extension = os.path.splitext(filename)[1].lower()
        result = ImportFileResult(filename=filename)

        if extension not in ALLOWED_EXTENSIONS:
            result.error = f"Formato non supportato: {extension or 'sconosciuto'}"
            results.append(result)
            continue

        try:
            data = uploaded.read()
            text = extract_text_from_bytes(data=data, filename=filename, extension=extension)
        except Exception as exc:
            result.error = str(exc)
            results.append(result)
            continue

        payloads = _build_offer_payloads(filename=filename, text=text, defaults=defaults)
        if not payloads:
            result.error = "Nessun testo estraibile dal file."
            results.append(result)
            continue

        for payload in payloads:
            offer = TechnicalOffer.objects.create(
                owner=owner,
                organization=organization,
                **payload,
            )
            result.created.append(offer)

        results.append(result)

    return results
