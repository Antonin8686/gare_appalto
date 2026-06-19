from __future__ import annotations

from ..models import Document


def infer_doc_type(filename: str, *, url: str = "") -> str:
    """Deduce il tipo documento da nome file (e opzionalmente URL)."""
    combined = f"{filename} {url}".lower()
    if "disciplinare" in combined or "disciplina" in combined:
        return Document.DocType.DISCIPLINARE
    if "capitolato" in combined or "capit" in combined:
        return Document.DocType.CAPITOLATO
    if "allegat" in combined:
        return Document.DocType.ALLEGATO
    return Document.DocType.ALTRO


def is_disciplinare_doc(doc_type: str, document_name: str) -> bool:
    if doc_type == Document.DocType.DISCIPLINARE:
        return True
    return "disciplinare" in document_name.lower() or "disciplina" in document_name.lower()


def is_allegato_doc(doc_type: str, document_name: str) -> bool:
    if doc_type == Document.DocType.ALLEGATO:
        return True
    return "allegat" in document_name.lower()
