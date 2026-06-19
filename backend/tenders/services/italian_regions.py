"""Utility per provincia e regione italiane (import Telemat / bandi)."""

from __future__ import annotations

import re

PROVINCE_TO_REGION: dict[str, str] = {
    "AG": "Sicilia",
    "AL": "Piemonte",
    "AN": "Marche",
    "AO": "Valle d'Aosta",
    "AP": "Marche",
    "AQ": "Abruzzo",
    "AR": "Toscana",
    "AT": "Piemonte",
    "AV": "Campania",
    "BA": "Puglia",
    "BG": "Lombardia",
    "BI": "Piemonte",
    "BL": "Veneto",
    "BN": "Campania",
    "BO": "Emilia-Romagna",
    "BR": "Puglia",
    "BS": "Lombardia",
    "BT": "Puglia",
    "BZ": "Trentino-Alto Adige",
    "CA": "Sardegna",
    "CB": "Molise",
    "CE": "Campania",
    "CH": "Abruzzo",
    "CL": "Sicilia",
    "CN": "Piemonte",
    "CO": "Lombardia",
    "CR": "Lombardia",
    "CS": "Calabria",
    "CT": "Sicilia",
    "CZ": "Calabria",
    "EN": "Sicilia",
    "FC": "Emilia-Romagna",
    "FE": "Emilia-Romagna",
    "FG": "Puglia",
    "FI": "Toscana",
    "FM": "Marche",
    "FR": "Lazio",
    "GE": "Liguria",
    "GO": "Friuli-Venezia Giulia",
    "GR": "Toscana",
    "IM": "Liguria",
    "IS": "Molise",
    "KR": "Calabria",
    "LC": "Lombardia",
    "LE": "Puglia",
    "LI": "Toscana",
    "LO": "Lombardia",
    "LT": "Lazio",
    "LU": "Toscana",
    "MB": "Lombardia",
    "MC": "Marche",
    "ME": "Sicilia",
    "MI": "Lombardia",
    "MN": "Lombardia",
    "MO": "Emilia-Romagna",
    "MS": "Toscana",
    "MT": "Basilicata",
    "NA": "Campania",
    "NO": "Piemonte",
    "NU": "Sardegna",
    "OR": "Sardegna",
    "PA": "Sicilia",
    "PC": "Emilia-Romagna",
    "PD": "Veneto",
    "PE": "Abruzzo",
    "PG": "Umbria",
    "PI": "Toscana",
    "PN": "Friuli-Venezia Giulia",
    "PO": "Toscana",
    "PR": "Emilia-Romagna",
    "PT": "Toscana",
    "PU": "Marche",
    "PV": "Lombardia",
    "PZ": "Basilicata",
    "RA": "Emilia-Romagna",
    "RC": "Calabria",
    "RE": "Emilia-Romagna",
    "RG": "Sicilia",
    "RI": "Lazio",
    "RM": "Lazio",
    "RN": "Emilia-Romagna",
    "RO": "Veneto",
    "SA": "Campania",
    "SI": "Toscana",
    "SO": "Lombardia",
    "SP": "Liguria",
    "SR": "Sicilia",
    "SS": "Sardegna",
    "SU": "Sardegna",
    "SV": "Liguria",
    "TA": "Puglia",
    "TE": "Abruzzo",
    "TN": "Trentino-Alto Adige",
    "TO": "Piemonte",
    "TP": "Sicilia",
    "TR": "Umbria",
    "TS": "Friuli-Venezia Giulia",
    "TV": "Veneto",
    "UD": "Friuli-Venezia Giulia",
    "VA": "Lombardia",
    "VB": "Piemonte",
    "VC": "Piemonte",
    "VE": "Veneto",
    "VI": "Veneto",
    "VR": "Veneto",
    "VT": "Lazio",
    "VV": "Calabria",
}

PROVINCIA_PATTERN = re.compile(r"\(([A-Z]{2})\)")


def extract_provincia_from_text(text: str) -> str:
    if not text:
        return ""
    matches = PROVINCIA_PATTERN.findall(text.upper())
    for code in reversed(matches):
        if code in PROVINCE_TO_REGION:
            return code
    return ""


def provincia_to_regione(provincia: str) -> str:
    if not provincia:
        return ""
    return PROVINCE_TO_REGION.get(provincia.upper(), "")


def resolve_regione_provincia(
    *,
    provincia: str = "",
    regione: str = "",
    stazione_appaltante: str = "",
    zona: str = "",
    oggetto: str = "",
) -> tuple[str, str]:
    resolved_provincia = (provincia or "").strip().upper()
    resolved_regione = (regione or "").strip()

    if not resolved_provincia:
        for text in (zona, stazione_appaltante, oggetto):
            resolved_provincia = extract_provincia_from_text(text)
            if resolved_provincia:
                break

    if not resolved_regione and resolved_provincia:
        resolved_regione = provincia_to_regione(resolved_provincia)

    return resolved_provincia, resolved_regione
