from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from ..models import Tender, TenderEvaluation


@dataclass
class ScoringResult:
    priority_score: int
    priorita: str

    def to_dict(self) -> dict[str, int | str]:
        return {
            "priority_score": self.priority_score,
            "priorita": self.priorita,
        }


def _score_importo(importo: Decimal) -> int:
    if importo >= Decimal("500000"):
        return 35
    if importo >= Decimal("100000"):
        return 25
    if importo >= Decimal("30000"):
        return 15
    return 5


def _score_scadenza(scadenza: date, today: date | None = None) -> int:
    today = today or date.today()
    days = (scadenza - today).days
    if days < 0:
        return 0
    if days <= 14:
        return 35
    if days <= 30:
        return 25
    if days <= 60:
        return 15
    return 5


def _score_stato(stato: str) -> int:
    if stato == Tender.Stato.APERTA:
        return 20
    if stato == Tender.Stato.BOZZA:
        return 10
    return 0


def _best_semaforo(tender: Tender) -> str | None:
    evaluations = list(
        tender.evaluations.values_list("semaforo", flat=True)
    )
    if not evaluations:
        return None
    if TenderEvaluation.Semaforo.VERDE in evaluations:
        return TenderEvaluation.Semaforo.VERDE
    if TenderEvaluation.Semaforo.GIALLO in evaluations:
        return TenderEvaluation.Semaforo.GIALLO
    return TenderEvaluation.Semaforo.ROSSO


def _score_compatibilita(best_semaforo: str | None) -> int:
    if best_semaforo == TenderEvaluation.Semaforo.VERDE:
        return 10
    if best_semaforo == TenderEvaluation.Semaforo.GIALLO:
        return 5
    if best_semaforo == TenderEvaluation.Semaforo.ROSSO:
        return 0
    return 3


def _priorita_from_score(score: int) -> str:
    if score >= 70:
        return Tender.Priorita.ALTA
    if score >= 40:
        return Tender.Priorita.MEDIA
    return Tender.Priorita.BASSA


def compute_tender_scoring(tender: Tender, today: date | None = None) -> ScoringResult:
    today = today or date.today()
    score = (
        _score_importo(tender.importo)
        + _score_scadenza(tender.scadenza, today)
        + _score_stato(tender.stato)
        + _score_compatibilita(_best_semaforo(tender))
    )
    return ScoringResult(
        priority_score=min(score, 100),
        priorita=_priorita_from_score(score),
    )


def apply_scoring_to_tender(tender: Tender, today: date | None = None) -> ScoringResult:
    result = compute_tender_scoring(tender, today)
    tender.priority_score = result.priority_score
    tender.priorita = result.priorita
    tender.save(update_fields=["priority_score", "priorita", "updated_at"])
    return result
