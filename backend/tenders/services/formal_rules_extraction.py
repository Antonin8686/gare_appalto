"""Estrazione regole formali da disciplinari e capitolati italiani."""

from __future__ import annotations

import re

from .extraction import ExtractedFormalRule, FORMAL_RULE_CATEGORIES

FORMAL_RULE_LEGACY_PATTERN = re.compile(
    r"regola\s+formale\s+(pagine|font|margini|allegati)\s*[:\-]\s*"
    r"(.+?)(?:\n|$)",
    re.IGNORECASE,
)

DOC_LIST_SECTION_PATTERN = re.compile(
    r"documentazione\s+di\s+gara\s+comprende\s*:?\s*(.+?)"
    r"(?=\n\s*(?:La documentazione|2\.\d|CHIARIMENTI|È possibile|\Z))",
    re.IGNORECASE | re.DOTALL,
)
DOC_LIST_ITEM_PATTERN = re.compile(
    r"^[a-h]\)\s*(.+?)\s*$",
    re.MULTILINE | re.IGNORECASE,
)

A4_RELATION_PATTERN = re.compile(
    r"((?:relazione|offerta)\s+tecnica[^.\n]{0,40})?"
    r"[^.\n]{0,40}formato\s+A4[^.\n]{0,260}\.",
    re.IGNORECASE | re.DOTALL,
)
PAGE_LIMIT_PATTERN = re.compile(
    r"numero\s+di\s+facciate\s+superiore\s+a\s+(\d+)\s*\([^)]+\)",
    re.IGNORECASE,
)
PAGE_EXCLUSION_PATTERN = re.compile(
    r"esclusi\s+dal\s+conteggio\s+delle\s+pagine\s*:\s*(.+?)(?=\n\s*\n|\n\s*\d+\.|\Z)",
    re.IGNORECASE | re.DOTALL,
)
FONT_DETAIL_PATTERN = re.compile(
    r"interlinea\s+([\d.,]+)\s*-\s*con\s+carattere\s+preferibilmente\s+(\w+)\s*(\d+)",
    re.IGNORECASE,
)
MARGIN_PATTERN = re.compile(
    r"margini?\s+(?:di\s+)?(?:almeno\s+)?(\d+(?:[.,]\d+)?\s*(?:cm|mm))[^.\n]{0,120}",
    re.IGNORECASE,
)
REQUIRED_DOC_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "Domanda di partecipazione",
        re.compile(r"domanda\s+di\s+partecipazione", re.IGNORECASE),
    ),
    (
        "Offerta economica",
        re.compile(r"offerta\s+economica|modello\s+B", re.IGNORECASE),
    ),
    (
        "Offerta tecnica / relazione tecnica",
        re.compile(r"offerta\s+tecnica|relazione\s+tecnica", re.IGNORECASE),
    ),
    (
        "DGUE",
        re.compile(r"\bDGUE\b|documento\s+unico\s+di\s+gara", re.IGNORECASE),
    ),
    (
        "Documentazione in caso di avvalimento",
        re.compile(r"documentazione\s+in\s+caso\s+di\s+avvalimento", re.IGNORECASE),
    ),
)


def _add_rule(
    rules: list[ExtractedFormalRule],
    seen: set[tuple[str, str]],
    *,
    category: str,
    label: str,
    detail: str = "",
) -> None:
    if category not in FORMAL_RULE_CATEGORIES:
        return
    cleaned_label = re.sub(r"\s+", " ", label).strip(" -–:;.")
    if len(cleaned_label) < 4:
        return
    key = (category, cleaned_label.lower()[:120])
    if key in seen:
        return
    seen.add(key)
    rules.append(
        {
            "category": category,
            "label": cleaned_label[:500],
            "detail": re.sub(r"\s+", " ", detail).strip()[:1000],
        }
    )


def _parse_legacy_rules(text: str, rules: list[ExtractedFormalRule], seen: set[tuple[str, str]]) -> None:
    for match in FORMAL_RULE_LEGACY_PATTERN.finditer(text):
        category = match.group(1).lower()
        full_text = match.group(2).strip()
        if not full_text:
            continue
        if " - " in full_text:
            label, detail = full_text.split(" - ", 1)
        else:
            label, detail = full_text, ""
        _add_rule(rules, seen, category=category, label=label, detail=detail)


def _parse_page_rules(text: str, rules: list[ExtractedFormalRule], seen: set[tuple[str, str]]) -> None:
    if match := A4_RELATION_PATTERN.search(text):
        paragraph = re.sub(r"\s+", " ", match.group(0)).strip()
        _add_rule(
            rules,
            seen,
            category="pagine",
            label="Formato e impaginazione offerta tecnica",
            detail=paragraph,
        )

    if match := PAGE_LIMIT_PATTERN.search(text):
        limit = match.group(1)
        detail = f"Massimo {limit} facciate per la relazione/offerta tecnica."
        if exclusion := PAGE_EXCLUSION_PATTERN.search(text):
            excluded = re.sub(r"\s+", " ", exclusion.group(1)).strip()
            detail = f"{detail} Esclusi dal conteggio: {excluded}"
        _add_rule(
            rules,
            seen,
            category="pagine",
            label=f"Limite massimo {limit} facciate",
            detail=detail,
        )


def _parse_font_rules(text: str, rules: list[ExtractedFormalRule], seen: set[tuple[str, str]]) -> None:
    if match := FONT_DETAIL_PATTERN.search(text):
        interlinea, font_name, font_size = match.groups()
        _add_rule(
            rules,
            seen,
            category="font",
            label=f"Carattere {font_name} {font_size}",
            detail=f"Interlinea {interlinea}; formato A4.",
        )
    elif "formato a4" in text.lower() and "carattere" in text.lower():
        snippet_match = re.search(
            r"formato\s+A4[^.\n]{0,120}carattere[^.\n]{0,80}",
            text,
            re.IGNORECASE,
        )
        if snippet_match:
            _add_rule(
                rules,
                seen,
                category="font",
                label="Formato caratteri e impaginazione",
                detail=re.sub(r"\s+", " ", snippet_match.group(0)).strip(),
            )


def _parse_margin_rules(text: str, rules: list[ExtractedFormalRule], seen: set[tuple[str, str]]) -> None:
    for match in MARGIN_PATTERN.finditer(text):
        detail = re.sub(r"\s+", " ", match.group(0)).strip()
        _add_rule(
            rules,
            seen,
            category="margini",
            label=f"Margini {match.group(1)}",
            detail=detail,
        )


def _parse_attachment_rules(text: str, rules: list[ExtractedFormalRule], seen: set[tuple[str, str]]) -> None:
    if section := DOC_LIST_SECTION_PATTERN.search(text):
        section_text = section.group(1)
        for item_match in DOC_LIST_ITEM_PATTERN.finditer(section_text):
            item = re.sub(r"\s+", " ", item_match.group(1)).strip(" -–:;.")
            if item:
                _add_rule(rules, seen, category="allegati", label=item)

    for label, pattern in REQUIRED_DOC_PATTERNS:
        if pattern.search(text):
            _add_rule(rules, seen, category="allegati", label=label)


def parse_formal_rules_from_document(text: str) -> list[ExtractedFormalRule]:
    if not text.strip():
        return []

    rules: list[ExtractedFormalRule] = []
    seen: set[tuple[str, str]] = set()

    _parse_legacy_rules(text, rules, seen)
    _parse_page_rules(text, rules, seen)
    _parse_font_rules(text, rules, seen)
    _parse_margin_rules(text, rules, seen)
    _parse_attachment_rules(text, rules, seen)

    return rules
