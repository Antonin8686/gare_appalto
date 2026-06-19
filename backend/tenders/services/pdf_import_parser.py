"""Estrazione tabelle da testo PDF (Telemat) con fallback OCR."""

from __future__ import annotations

import re

from .import_parser import COLUMN_ALIASES, _map_headers, _normalize_header, _split_line_to_cells

CIG_PATTERN = re.compile(r"\b([A-Z0-9]{10})\b")
CPV_PATTERN = re.compile(r"\b(\d{8})\b")
DATE_PATTERN = re.compile(r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b")
IMPORTO_PATTERN = re.compile(
    r"(?:€|EUR)?\s*([\d]{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)",
    re.IGNORECASE,
)
URL_PATTERN = re.compile(r"https?://[^\s\]>]+", re.IGNORECASE)


def extract_rows_from_pdf_text(text: str) -> list[list[str]]:
    """Converte testo PDF in righe tabellari compatibili con il parser import."""
    cleaned = _normalize_pdf_text(text)
    if not cleaned.strip():
        return []

    tabular = _text_to_tabular_rows(cleaned)
    if tabular and _rows_have_cig_column(tabular):
        return tabular

    scanned = _text_to_rows_via_cig_scan(cleaned)
    if scanned and _rows_have_cig_column(scanned):
        return scanned

    return []


def _normalize_pdf_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[ \t]+\n", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _rows_have_cig_column(rows: list[list[str]]) -> bool:
    if not rows:
        return False
    headers = [str(cell) if cell is not None else "" for cell in rows[0]]
    return "cig" in _map_headers(headers)


def _text_to_tabular_rows(text: str) -> list[list[str]]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return []

    header_index = _find_header_row_index(lines)
    if header_index is None:
        return []

    header_cells = _split_line_to_cells(lines[header_index])
    if not header_cells:
        return []

    rows: list[list[str]] = [header_cells]
    expected_len = len(header_cells)

    for line in lines[header_index + 1 :]:
        if _looks_like_header_repeat(line, header_cells):
            continue
        if _is_page_footer(line):
            continue

        cells = _split_line_to_cells(line)
        if not cells:
            continue

        if _map_headers([str(c) for c in cells]).get("cig") is not None and len(cells) <= 3:
            continue

        if not _row_likely_data(cells):
            continue

        if len(cells) < expected_len:
            cells = cells + [""] * (expected_len - len(cells))
        elif len(cells) > expected_len:
            cells = cells[: expected_len - 1] + [" ".join(cells[expected_len - 1 :])]

        rows.append(cells)

    return rows if len(rows) > 1 else []


def _find_header_row_index(lines: list[str]) -> int | None:
    scan_limit = min(len(lines), 80)
    for index in range(scan_limit):
        line = lines[index]
        cells = _split_line_to_cells(line)
        if cells:
            mapping = _map_headers([str(cell) for cell in cells])
            if "cig" in mapping:
                return index

        normalized_line = _normalize_header(line)
        if any(alias in normalized_line for alias in COLUMN_ALIASES["cig"]):
            if cells:
                return index
            tokens = re.split(r"\s{2,}|\t|\|", line)
            tokens = [token.strip() for token in tokens if token.strip()]
            if tokens and "cig" in _map_headers(tokens):
                return index
    return None


def _looks_like_header_repeat(line: str, header_cells: list[str]) -> bool:
    normalized_line = _normalize_header(line)
    normalized_headers = {_normalize_header(cell) for cell in header_cells}
    matches = sum(1 for header in normalized_headers if header and header in normalized_line)
    return matches >= max(2, len(normalized_headers) // 2)


def _is_page_footer(line: str) -> bool:
    lowered = line.lower()
    return any(
        token in lowered
        for token in ("pagina", "page ", "telemat", "report generato", "stampa del")
    ) and CIG_PATTERN.search(line.upper()) is None


def _row_likely_data(cells: list[str]) -> bool:
    joined = " ".join(cells).upper()
    if CIG_PATTERN.search(joined):
        return True
    if len(cells) >= 3 and any(cell.strip() for cell in cells):
        return True
    return False


def _text_to_rows_via_cig_scan(text: str) -> list[list[str]]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    header = [
        "cig",
        "cpv",
        "importo",
        "scadenza",
        "stato",
        "oggetto",
        "stazione appaltante",
        "durata",
        "link",
    ]
    rows: list[list[str]] = [header]
    seen_cigs: set[str] = set()

    for index, line in enumerate(lines):
        upper_line = line.upper()
        for match in CIG_PATTERN.finditer(upper_line):
            cig = match.group(1).upper()
            if cig in seen_cigs or not _is_plausible_cig(cig):
                continue

            context_lines = lines[index : index + 4]
            context = " ".join(context_lines)
            row = _build_row_from_context(cig, line, context)
            if row:
                seen_cigs.add(cig)
                rows.append(row)

    return rows if len(rows) > 1 else []


def _is_plausible_cig(cig: str) -> bool:
    if len(cig) != 10:
        return False
    if len(set(cig)) == 1:
        return False
    if not re.search(r"\d", cig):
        return False
    return True


def _build_row_from_context(cig: str, line: str, context: str) -> list[str] | None:
    cpv_match = CPV_PATTERN.search(context)
    date_match = DATE_PATTERN.search(context)
    importo_match = IMPORTO_PATTERN.search(context)
    url_match = URL_PATTERN.search(context)

    oggetto = _extract_oggetto(line, cig, cpv_match, date_match, importo_match)
    if not oggetto and not (cpv_match or date_match or importo_match):
        return None

    return [
        cig,
        cpv_match.group(1) if cpv_match else "",
        importo_match.group(1) if importo_match else "",
        date_match.group(1) if date_match else "",
        "",
        oggetto[:500],
        "",
        "",
        url_match.group(0) if url_match else "",
    ]


def _extract_oggetto(
    line: str,
    cig: str,
    cpv_match: re.Match[str] | None,
    date_match: re.Match[str] | None,
    importo_match: re.Match[str] | None,
) -> str:
    oggetto = line
    oggetto = re.sub(re.escape(cig), " ", oggetto, flags=re.IGNORECASE)
    if cpv_match:
        oggetto = oggetto.replace(cpv_match.group(1), " ")
    if date_match:
        oggetto = oggetto.replace(date_match.group(1), " ")
    if importo_match:
        oggetto = oggetto.replace(importo_match.group(0), " ")
    oggetto = re.sub(r"\s+", " ", oggetto).strip(" -|,")
    return oggetto
