from dataclasses import dataclass, field
from typing import Any

from companies.models import Company

from tenders.models import Requirement, Tender
from tenders.services.evaluation import evaluate_requirement

from .coverage import (
    FORMA_AVVALIMENTO,
    FORMA_CONSORZIO,
    FORMA_LABELS,
    FORMA_RTI,
    FORMA_SINGOLA,
    ParticipationAnalysis,
    analyze_participation,
)


@dataclass
class ParticipationSuggestion:
    forma: str
    forma_label: str
    motivazione: str
    confidenza: str
    company_ids: list[int]
    mandataria_id: int | None = None
    mandanti_ids: list[int] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "forma": self.forma,
            "forma_label": self.forma_label,
            "motivazione": self.motivazione,
            "confidenza": self.confidenza,
            "company_ids": self.company_ids,
            "mandataria_id": self.mandataria_id,
            "mandanti_ids": self.mandanti_ids or [],
        }


def _score_company_on_requirements(company: Company, requirements: list[Requirement]) -> dict[str, int]:
    counts = {"verde": 0, "giallo": 0, "rosso": 0}
    obbligatori_rossi = 0
    for req in requirements:
        result = evaluate_requirement(company, req)
        counts[result.esito] = counts.get(result.esito, 0) + 1
        if result.esito == "rosso" and (
            req.obbligatorio or req.tipo == Requirement.Tipo.OBBLIGATORIO
        ):
            obbligatori_rossi += 1
    counts["obbligatori_rossi"] = obbligatori_rossi
    counts["score"] = counts["verde"] * 3 + counts["giallo"] - counts["rosso"] * 5 - obbligatori_rossi * 3
    return counts


def _participation_allowed(tender: Tender, forma: str) -> bool:
    requirements = list(tender.requirements.all())
    if not requirements:
        return True

    if forma == FORMA_RTI:
        return True
    if forma == FORMA_CONSORZIO:
        return any(req.consorzio_consentito for req in requirements)
    if forma == FORMA_AVVALIMENTO:
        return any(req.avvalimento_consentito for req in requirements)
    return True


def _pick_best_subset(
    companies: list[Company],
    requirements: list[Requirement],
    size: int,
) -> list[Company]:
    if size >= len(companies):
        return companies

    ranked = sorted(
        companies,
        key=lambda company: _score_company_on_requirements(company, requirements)["score"],
        reverse=True,
    )
    return ranked[:size]


def suggest_participation_form(
    tender: Tender,
    companies: list[Company],
) -> tuple[ParticipationSuggestion, ParticipationAnalysis]:
    requirements = list(tender.requirements.all())
    if not companies:
        suggestion = ParticipationSuggestion(
            forma=FORMA_SINGOLA,
            forma_label=FORMA_LABELS[FORMA_SINGOLA],
            motivazione="Registra almeno un'azienda per ottenere un suggerimento.",
            confidenza="bassa",
            company_ids=[],
        )
        analysis = ParticipationAnalysis(
            forma=FORMA_SINGOLA,
            forma_label=FORMA_LABELS[FORMA_SINGOLA],
            copertura=analyze_participation(tender, forma=FORMA_SINGOLA, companies=[]).copertura,
        )
        return suggestion, analysis

    scores = {
        company.id: _score_company_on_requirements(company, requirements) for company in companies
    }
    best_single = max(companies, key=lambda c: scores[c.id]["score"])
    single_analysis = analyze_participation(
        tender,
        forma=FORMA_SINGOLA,
        companies=[best_single],
    )

    if single_analysis.copertura.non_soddisfatti == 0 and single_analysis.copertura.parziali == 0:
        suggestion = ParticipationSuggestion(
            forma=FORMA_SINGOLA,
            forma_label=FORMA_LABELS[FORMA_SINGOLA],
            motivazione=(
                f"{best_single.name} soddisfa tutti i requisiti in autonomia. "
                "La partecipazione singola è la forma più semplice."
            ),
            confidenza="alta",
            company_ids=[best_single.id],
            mandataria_id=best_single.id,
        )
        return suggestion, single_analysis

    candidates: list[tuple[str, ParticipationAnalysis, list[Company], str]] = []

    if _participation_allowed(tender, FORMA_RTI) and len(companies) >= 2:
        rti_companies = _pick_best_subset(companies, requirements, min(3, len(companies)))
        rti_analysis = analyze_participation(
            tender,
            forma=FORMA_RTI,
            companies=rti_companies,
        )
        candidates.append(
            (
                FORMA_RTI,
                rti_analysis,
                rti_companies,
                "RTI per integrare capacità tecniche ed economiche tra imprese complementari.",
            )
        )

    if _participation_allowed(tender, FORMA_CONSORZIO) and len(companies) >= 2:
        consorzio_companies = _pick_best_subset(companies, requirements, min(3, len(companies)))
        consorzio_analysis = analyze_participation(
            tender,
            forma=FORMA_CONSORZIO,
            companies=consorzio_companies,
        )
        candidates.append(
            (
                FORMA_CONSORZIO,
                consorzio_analysis,
                consorzio_companies,
                "Consorzio utile quando il bando prevede esplicitamente questa forma.",
            )
        )

    if _participation_allowed(tender, FORMA_AVVALIMENTO) and len(companies) >= 2:
        auxiliary = _pick_best_subset(companies, requirements, 2)
        if len(auxiliary) == 2:
            principal, helper = auxiliary[0], auxiliary[1]
            avvalimento_analysis = analyze_participation(
                tender,
                forma=FORMA_AVVALIMENTO,
                companies=[principal],
                avvalimenti=[
                    {
                        "impresa_principale_id": principal.id,
                        "impresa_ausiliaria_id": helper.id,
                        "requisiti_coperti": [
                            item.requirement_id
                            for item in single_analysis.requisiti
                            if item.esito != "soddisfatto"
                        ],
                    }
                ],
            )
            candidates.append(
                (
                    FORMA_AVVALIMENTO,
                    avvalimento_analysis,
                    [principal, helper],
                    (
                        f"Avvalimento di {helper.name} a favore di {principal.name} "
                        "per colmare i requisiti mancanti."
                    ),
                )
            )

    candidates.append(
        (
            FORMA_SINGOLA,
            single_analysis,
            [best_single],
            (
                f"Partecipazione singola con {best_single.name}: "
                f"{single_analysis.copertura.soddisfatti}/{single_analysis.copertura.totale} "
                "requisiti soddisfatti."
            ),
        )
    )

    def ranking_key(item: tuple[str, ParticipationAnalysis, list[Company], str]) -> tuple:
        analysis = item[1]
        copertura = analysis.copertura
        return (
            -copertura.percentuale,
            copertura.non_soddisfatti,
            copertura.parziali,
        )

    best_forma, best_analysis, best_companies, motivazione = min(candidates, key=ranking_key)

    confidenza = "alta"
    if best_analysis.copertura.non_soddisfatti > 0:
        confidenza = "bassa"
    elif best_analysis.copertura.parziali > 0:
        confidenza = "media"

    mandataria = best_companies[0] if best_companies else None
    mandanti = best_companies[1:] if len(best_companies) > 1 else []

    suggestion = ParticipationSuggestion(
        forma=best_forma,
        forma_label=FORMA_LABELS[best_forma],
        motivazione=motivazione,
        confidenza=confidenza,
        company_ids=[company.id for company in best_companies],
        mandataria_id=mandataria.id if mandataria else None,
        mandanti_ids=[company.id for company in mandanti],
    )
    return suggestion, best_analysis
