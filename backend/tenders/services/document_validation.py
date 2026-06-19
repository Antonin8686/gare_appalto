import re
from decimal import Decimal

from ..models import Document, Tender
from .document_types import is_allegato_doc, is_disciplinare_doc
from .extraction import ExtractedMetadata, parse_requirements
from .criterion_extraction import parse_evaluation_criteria

TENDER_KEYWORDS = (
    "gara",
    "appalto",
    "bando",
    "disciplinare",
    "capitolato",
    "stazione appaltante",
    "procedura",
    "aggiudicazione",
    "contratto",
    "offerta",
    "requisito",
    "partecipazione",
    "cig",
    "cpv",
    "importo",
    "scadenza",
    "termine",
    "lotto",
    "servizio",
    "fornitura",
    "lavori",
)

MIN_USEFUL_TEXT_LENGTH = 80


def _is_provisional_telemat_cig(tender: Tender, cig: str) -> bool:
    """Rif. Bando Telemat (solo cifre) usato provvisoriamente fino al disciplinare."""
    if tender.source != Tender.Source.TELEMAT:
        return False
    cleaned = cig.strip()
    return cleaned.isdigit() and 6 <= len(cleaned) <= 10


def validate_tender_document(
    *,
    tender: Tender,
    text: str,
    metadata: ExtractedMetadata,
    document_name: str,
    doc_type: str = Document.DocType.ALTRO,
    relaxed: bool = False,
) -> list[str]:
    """Verifica coerenza del documento con le attese del modulo analisi gara."""
    issues: list[str] = []
    normalized = text.strip()
    lowered = normalized.lower()
    disciplinare = is_disciplinare_doc(doc_type, document_name)
    allegato = is_allegato_doc(doc_type, document_name)

    if not normalized:
        issues.append(
            "Nessun testo estratto dal documento: il file potrebbe essere vuoto, "
            "scansionato senza OCR disponibile o illeggibile."
        )
        return issues

    useful_chars = len(re.sub(r"\s+", "", normalized))
    if useful_chars < MIN_USEFUL_TEXT_LENGTH:
        issues.append(
            f"Contenuto insufficiente ({useful_chars} caratteri utili): "
            "un documento di gara deve contenere testo descrittivo significativo."
        )
        return issues

    if relaxed or allegato:
        return issues

    if not any(keyword in lowered for keyword in TENDER_KEYWORDS):
        issues.append(
            "Il contenuto non sembra documentazione di gara: mancano riferimenti a "
            "appalto, bando, disciplinare, capitolato, requisiti o dati procedurali."
        )

    has_cig = bool(metadata.get("cig"))
    has_cpv = bool(metadata.get("cpv"))
    has_importo = bool(metadata.get("importo"))
    has_scadenza = bool(metadata.get("scadenza"))

    if not disciplinare and not any((has_cig, has_cpv, has_importo, has_scadenza)):
        issues.append(
            "Non sono state rilevate informazioni essenziali della procedura "
            "(CIG, CPV, importo o scadenza/termine offerte)."
        )

    doc_cig = metadata.get("cig", "")
    if (
        not disciplinare
        and tender.cig
        and has_cig
        and doc_cig != tender.cig
        and not _is_provisional_telemat_cig(tender, tender.cig)
    ):
        issues.append(
            f"Il CIG nel documento ({doc_cig}) non coincide con quello della gara ({tender.cig})."
        )

    if not disciplinare and tender.cpv and has_cpv and metadata["cpv"] != tender.cpv:
        issues.append(
            f"Il CPV nel documento ({metadata['cpv']}) non coincide con quello della gara ({tender.cpv})."
        )

    if not disciplinare and tender.importo and has_importo:
        doc_importo = metadata["importo"]
        if isinstance(doc_importo, Decimal) and doc_importo != tender.importo:
            issues.append(
                f"L'importo nel documento ({doc_importo}) non coincide con quello della gara ({tender.importo})."
            )

    requirements = parse_requirements(text, document_name=document_name)
    criteria = parse_evaluation_criteria(text, document_name=document_name)

    if not disciplinare and not requirements and not criteria:
        issues.append(
            "Non sono stati individuati requisiti di partecipazione né criteri di valutazione: "
            "il documento non contiene sezioni analizzabili previste dal disciplinare di gara."
        )

    if tender.oggetto and len(tender.oggetto.strip()) >= 12:
        oggetto_tokens = [
            token
            for token in re.findall(r"[a-zà-ù0-9]{4,}", tender.oggetto.lower())
            if token not in {"servizio", "fornitura", "appalto", "gara", "lavori"}
        ]
        if oggetto_tokens and not any(token in lowered for token in oggetto_tokens[:4]):
            issues.append(
                "L'oggetto della gara non risulta coerente con il contenuto del documento caricato."
            )

    return issues


class DocumentValidationError(Exception):
    def __init__(self, issues: list[str]):
        self.issues = issues
        super().__init__("\n".join(issues))
