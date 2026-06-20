from __future__ import annotations

import re

from ..models import Document

MODULO_NAME_PATTERN = re.compile(
    r"(?:^|[\s_\-])"
    r"(?:modello|modulo|mod\.|fac[\s-]?simile|scheda\s+di\s+offerta|domanda\s+di\s+partecipazione|dgue)"
    r"(?:[\s_\-]|$|\d|[a-z])",
    re.IGNORECASE,
)


def infer_doc_type(filename: str, *, url: str = "") -> str:
    """Deduce il tipo documento da nome file (e opzionalmente URL)."""
    combined = f"{filename} {url}".lower()
    if "disciplinare" in combined or "disciplina" in combined:
        return Document.DocType.DISCIPLINARE
    if "capitolato" in combined or "capit" in combined:
        return Document.DocType.CAPITOLATO
    if "allegat" in combined:
        return Document.DocType.ALLEGATO
    if is_modulo_name(filename) or is_modulo_name(url):
        return Document.DocType.MODULO
    return Document.DocType.ALTRO


def is_modulo_name(name: str) -> bool:
    if not name.strip():
        return False
    lowered = name.lower()
    if MODULO_NAME_PATTERN.search(lowered):
        return True
    if re.search(r"modello\s+[a-z0-9]", lowered):
        return True
    if "offerta tecnica" in lowered and ("modello" in lowered or "modulo" in lowered or "mod." in lowered):
        return True
    if "offerta economica" in lowered and ("modello" in lowered or "modulo" in lowered or "mod." in lowered):
        return True
    return False


def is_disciplinare_doc(doc_type: str, document_name: str) -> bool:
    if doc_type == Document.DocType.DISCIPLINARE:
        return True
    return "disciplinare" in document_name.lower() or "disciplina" in document_name.lower()


def is_allegato_doc(doc_type: str, document_name: str) -> bool:
    if doc_type == Document.DocType.ALLEGATO:
        return True
    return "allegat" in document_name.lower()


def is_modulo_doc(doc_type: str, document_name: str) -> bool:
    if doc_type == Document.DocType.MODULO:
        return True
    return is_modulo_name(document_name)


def is_supplementary_doc(doc_type: str, document_name: str) -> bool:
    """Moduli, allegati e documenti di supporto: validazione leggera (solo leggibilità)."""
    return is_allegato_doc(doc_type, document_name) or is_modulo_doc(doc_type, document_name)
