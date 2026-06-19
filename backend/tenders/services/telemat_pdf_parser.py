"""Parser per rassegne Telemat in formato PDF."""

from __future__ import annotations

import re

from .import_parser import ParsedTenderRow, _parse_importo, _parse_scadenza
from .italian_regions import resolve_regione_provincia

TELEMAT_MARKER = re.compile(r"rassegna\s+telemat|monitor appalti", re.IGNORECASE)
GARA_BLOCK_SPLIT = re.compile(r"(?=Gara Pubblica \d+ di totali \d+)", re.IGNORECASE)
HEADER_LINE = re.compile(
    r"(\d{6,10})\s+"
    r"(\d{2}/\d{2}/\d{4})\s+"
    r"(\d{2}/\d{2}/\d{4})\s+"
    r"([\d.,]+|NS)\b",
    re.IGNORECASE,
)
ENTE_SECTION = re.compile(
    r"Ente Appaltante\s*\n(.+?)(?=\nCategorie|\nZone|\nOggetto|\nProcedura di Gara|\Z)",
    re.IGNORECASE | re.DOTALL,
)
OGGETTO_SECTION = re.compile(
    r"Oggetto\s*\n(.+?)(?=\nProcedura di Gara|\nNote Rettifiche|\nNote\s|\Z)",
    re.IGNORECASE | re.DOTALL,
)
ZONE_SECTION = re.compile(
    r"Zone\s*\n(.+?)(?=\nOggetto|\nProcedura di Gara|\nNote|\Z)",
    re.IGNORECASE | re.DOTALL,
)
DURATA_SECTION = re.compile(
    r"Procedura di Gara Articoli Durata\s*\n.+?\s+(\d+\s+GIORNI|Ns)\b",
    re.IGNORECASE | re.DOTALL,
)
URL_PATTERN = re.compile(r"https?://[^\s\]>]+", re.IGNORECASE)


def is_telemat_rassegna_pdf(text: str) -> bool:
    return bool(TELEMAT_MARKER.search(text)) and "Gara Pubblica" in text and "Rif. Bando" in text


def parse_telemat_pdf(text: str) -> list[ParsedTenderRow]:
    blocks = GARA_BLOCK_SPLIT.split(text)
    parsed: list[ParsedTenderRow] = []
    seen_rif: set[str] = set()

    for block in blocks:
        row = _parse_telemat_block(block)
        if row and row.cig not in seen_rif:
            seen_rif.add(row.cig)
            parsed.append(row)

    if not parsed:
        raise ValueError("Nessuna gara Telemat trovata nel PDF.")

    return parsed


def _parse_telemat_block(block: str) -> ParsedTenderRow | None:
    if "Rif. Bando" not in block:
        return None

    header = HEADER_LINE.search(block)
    if not header:
        return None

    rif_bando = header.group(1).upper()
    scadenza_raw = header.group(3)
    importo_raw = header.group(4)

    from .extraction import extract_cig

    # Telemat espone il Rif. Bando (numerico); il CIG reale compare nel disciplinare.
    cig = extract_cig(block) or rif_bando[:10]

    ente = _extract_section(ENTE_SECTION, block)
    oggetto = _extract_section(OGGETTO_SECTION, block)
    zona = _extract_section(ZONE_SECTION, block)
    durata_match = DURATA_SECTION.search(block)
    durata = durata_match.group(1).strip() if durata_match else ""

    urls = URL_PATTERN.findall(block)
    document_url = urls[0] if urls else ""

    if not oggetto and not ente:
        return None

    provincia, regione = resolve_regione_provincia(
        stazione_appaltante=ente,
        zona=zona,
        oggetto=oggetto,
    )

    return ParsedTenderRow(
        cig=cig,
        cpv="00000000",
        importo=_parse_importo(importo_raw if importo_raw.upper() != "NS" else "0"),
        scadenza=_parse_scadenza(scadenza_raw),
        stato="aperta",
        oggetto=_normalize_multiline(oggetto)[:500],
        stazione_appaltante=_normalize_multiline(ente)[:255],
        zona=_normalize_multiline(zona)[:255],
        provincia=provincia,
        regione=regione,
        durata=durata[:100],
        document_url=document_url[:2048],
    )


def _extract_section(pattern: re.Pattern[str], block: str) -> str:
    match = pattern.search(block)
    if not match:
        return ""
    return match.group(1).strip()


def _normalize_multiline(value: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in value.splitlines()]
    lines = [line for line in lines if line]
    return " ".join(lines)
