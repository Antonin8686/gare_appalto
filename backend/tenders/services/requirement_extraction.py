import re
from typing import TypedDict

from ..models import Requirement

PAGINA_PATTERN = re.compile(
    r"(?:pag(?:ina|\.)?|p\.)\s*(\d{1,4})",
    re.IGNORECASE,
)
PARAGRAFO_PATTERN = re.compile(
    r"(?:art(?:icolo)?\.?|comma|§)\s*(\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
SOGLIA_MINIMA_PATTERN = re.compile(
    r"(?:soglia|minimo|almeno|pari\s+a|non\s+inferiore\s+a)\s*[:\-]?\s*"
    r"(€?\s*[\d][\d.\s]*(?:,\d{1,2})?|\d+(?:[.,]\d+)?\s*(?:%|dipendent|anni|mesi|unità))",
    re.IGNORECASE,
)
COMPROVA_PATTERN = re.compile(
    r"(?:modalità|modo)\s+(?:di\s+)?comprov(?:a|are)\s*[:\-]\s*(.+?)(?:\.|;|\n|$)",
    re.IGNORECASE,
)
SOGGETTO_PATTERN = re.compile(
    r"(?:soggetto|operatore|impresa|offerente)\s+(?:obbligat[oa]|tenut[oa])\s+(?:a\s+)?[:\-]?\s*(.+?)(?:\.|;|\n|$)",
    re.IGNORECASE,
)

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    Requirement.Categoria.GENERALE: (
        "esclusione",
        "durc",
        "antimafia",
        "contribut",
        "fiscale",
        "regolar",
        "white list",
        "sicurezza",
    ),
    Requirement.Categoria.IDONEITA_PROFESSIONALE: (
        "cciaa",
        "ateco",
        "iscrizione",
        "camera di commercio",
        "albo",
        "licenza",
        "autorizzazione",
    ),
    Requirement.Categoria.ECONOMICO_FINANZIARIO: (
        "fatturato",
        "patrimonio",
        "bilancio",
        "referenz",
        "bancar",
        "capitale",
        "indice",
    ),
    Requirement.Categoria.TECNICO_PROFESSIONALE: (
        "esperienz",
        "serviz",
        "analog",
        "personale",
        "attrezz",
        "organico",
        "presenza territoriale",
    ),
    Requirement.Categoria.CERTIFICAZIONE: (
        "iso",
        "certificaz",
        "soa",
        "rating",
        "sa8000",
        "emas",
    ),
}


class ExtractedRequirement(TypedDict):
    tipo: str
    descrizione: str
    soglia: str
    categoria: str
    obbligatorio: bool
    premiante: bool
    migliorativo: bool
    documento_origine: str
    pagina_origine: str
    paragrafo_origine: str
    modalita_comprova: str
    soggetto_obbligato: str
    avvalimento_consentito: bool
    rti_consentito: bool
    consorzio_consentito: bool
    soglia_minima: str
    note_interpretative: str


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def infer_categoria(text: str, tipo: str) -> str:
    lowered = text.lower()
    for categoria, keywords in CATEGORY_KEYWORDS.items():
        if _contains_any(lowered, keywords):
            return categoria

    if tipo == Requirement.Tipo.ECONOMICO:
        return Requirement.Categoria.ECONOMICO_FINANZIARIO
    if tipo == Requirement.Tipo.TECNICO:
        return Requirement.Categoria.TECNICO_PROFESSIONALE
    return Requirement.Categoria.GENERALE


def infer_flags(text: str) -> tuple[bool, bool, bool]:
    lowered = text.lower()
    premiante = any(word in lowered for word in ("premiant", "punteggio", "bonus"))
    migliorativo = any(
        word in lowered for word in ("migliorativ", "facoltativ", "ulteriori prestazioni")
    )
    obbligatorio = not any(
        word in lowered for word in ("facoltativ", "opzional", "eventual")
    )
    if premiante and not migliorativo:
        obbligatorio = False
    return obbligatorio, premiante, migliorativo


def infer_participation_flags(text: str) -> tuple[bool, bool, bool]:
    lowered = text.lower()
    avvalimento = "avvalimento" in lowered and any(
        word in lowered for word in ("consentito", "ammesso", "possibile", "mediante")
    )
    rti = any(
        phrase in lowered
        for phrase in (
            "rti",
            "raggruppamento temporaneo",
            "raggruppamento di imprese",
        )
    ) and any(word in lowered for word in ("consentito", "ammesso", "mediante", "in forma"))
    consorzio = "consorzio" in lowered and any(
        word in lowered for word in ("consentito", "ammesso", "mediante", "stabile")
    )
    return avvalimento, rti, consorzio


def extract_pagina(text: str) -> str:
    match = PAGINA_PATTERN.search(text)
    return match.group(1) if match else ""


def extract_paragrafo(text: str) -> str:
    match = PARAGRAFO_PATTERN.search(text)
    return match.group(1) if match else ""


def extract_soglia_minima(text: str, soglia: str = "") -> str:
    if soglia.strip():
        return soglia.strip()
    match = SOGLIA_MINIMA_PATTERN.search(text)
    if match:
        return match.group(1).strip()
    return ""


def extract_modalita_comprova(text: str) -> str:
    match = COMPROVA_PATTERN.search(text)
    if match:
        return match.group(1).strip()[:500]
    if "comprov" in text.lower():
        for sentence in re.split(r"[.;]\s+", text):
            if "comprov" in sentence.lower():
                return sentence.strip()[:500]
    return ""


def extract_soggetto_obbligato(text: str) -> str:
    match = SOGGETTO_PATTERN.search(text)
    if match:
        return match.group(1).strip()[:255]
    if "offerente" in text.lower():
        return "Offerente"
    if "mandataria" in text.lower():
        return "Impresa mandataria"
    return ""


def extract_note_interpretative(text: str) -> str:
    lowered = text.lower()
    notes: list[str] = []
    if "ove ammesso" in lowered:
        notes.append("Verificare se la forma aggregata è ammessa dal disciplinare.")
    if "ai sensi" in lowered:
        for sentence in re.split(r"[.;]\s+", text):
            if "ai sensi" in sentence.lower():
                notes.append(sentence.strip())
    return " ".join(notes)[:1000]


def enrich_requirement(
    *,
    descrizione: str,
    tipo: str,
    soglia: str = "",
    document_name: str = "",
    context: str = "",
) -> ExtractedRequirement:
    combined = f"{descrizione} {context}".strip()
    obbligatorio, premiante, migliorativo = infer_flags(combined)
    avvalimento, rti, consorzio = infer_participation_flags(combined)
    soglia_minima = extract_soglia_minima(combined, soglia)

    return {
        "tipo": tipo,
        "descrizione": descrizione.strip(),
        "soglia": soglia_minima,
        "categoria": infer_categoria(combined, tipo),
        "obbligatorio": obbligatorio,
        "premiante": premiante,
        "migliorativo": migliorativo,
        "documento_origine": document_name.strip(),
        "pagina_origine": extract_pagina(combined),
        "paragrafo_origine": extract_paragrafo(combined),
        "modalita_comprova": extract_modalita_comprova(combined),
        "soggetto_obbligato": extract_soggetto_obbligato(combined),
        "avvalimento_consentito": avvalimento,
        "rti_consentito": rti,
        "consorzio_consentito": consorzio,
        "soglia_minima": soglia_minima,
        "note_interpretative": extract_note_interpretative(combined),
    }
