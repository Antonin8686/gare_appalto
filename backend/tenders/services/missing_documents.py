"""Confronto documenti richiesti (disciplinare) vs documenti caricati."""

from __future__ import annotations

import re
import unicodedata

from ..models import Document, Tender

CORE_DOCUMENT_HINTS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Disciplinare di gara", ("disciplinare", "disciplina di gara")),
    ("Capitolato / specifiche tecniche", ("capitolato", "specifiche tecniche", "specifica tecnica")),
)


def _normalize_label(value: str) -> str:
    lowered = value.lower().strip()
    normalized = unicodedata.normalize("NFKD", lowered)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _tokenize(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]{4,}", _normalize_label(value))
        if token not in {"della", "delle", "dello", "degli", "documento", "documentazione", "presente"}
    }


def _labels_match(required_label: str, candidate_text: str) -> bool:
    required_norm = _normalize_label(required_label)
    candidate_norm = _normalize_label(candidate_text)
    if required_norm and required_norm in candidate_norm:
        return True

    required_tokens = _tokenize(required_label)
    if not required_tokens:
        return False
    candidate_tokens = _tokenize(candidate_text)
    overlap = required_tokens & candidate_tokens
    if len(required_tokens) <= 2:
        return len(overlap) >= 1
    return len(overlap) >= min(2, len(required_tokens))


def _document_search_text(document: Document) -> str:
    return " ".join(
        str(part)
        for part in (
            document.name,
            document.original_filename,
            document.doc_type,
        )
        if part
    )


def _required_labels_from_formal_rules(tender: Tender) -> list[str]:
    labels: list[str] = []
    formal_rules = tender.formal_rules or {}
    allegati = formal_rules.get("allegati", [])
    if isinstance(allegati, list):
        for item in allegati:
            if isinstance(item, dict):
                label = str(item.get("label", "")).strip()
            else:
                label = str(item).strip()
            if label:
                labels.append(label)
    return labels


def build_document_checklist(tender: Tender) -> dict:
    documents = list(
        tender.documents.exclude(status=Document.Status.FAILED).order_by("-uploaded_at")
    )
    uploaded_blob = " ".join(_document_search_text(doc) for doc in documents)

    required_items: list[dict] = []

    for label, hints in CORE_DOCUMENT_HINTS:
        matched = any(_labels_match(label, _document_search_text(doc)) for doc in documents) or any(
            hint in uploaded_blob for hint in hints
        )
        required_items.append(
            {
                "label": label,
                "category": "core",
                "matched": matched,
                "source": "sistema",
            }
        )

    for label in _required_labels_from_formal_rules(tender):
        matched = _labels_match(label, uploaded_blob)
        required_items.append(
            {
                "label": label,
                "category": "formal_rule",
                "matched": matched,
                "source": "disciplinare",
            }
        )

    seen_labels: set[str] = set()
    deduped_required: list[dict] = []
    for item in required_items:
        key = _normalize_label(item["label"])
        if key in seen_labels:
            continue
        seen_labels.add(key)
        deduped_required.append(item)

    missing = [item for item in deduped_required if not item["matched"]]
    matched = [item for item in deduped_required if item["matched"]]

    return {
        "required_count": len(deduped_required),
        "matched_count": len(matched),
        "missing_count": len(missing),
        "required": deduped_required,
        "missing": missing,
        "matched": matched,
        "has_disciplinare": any(
            doc.doc_type == Document.DocType.DISCIPLINARE or "disciplinare" in doc.name.lower()
            for doc in documents
        ),
    }
