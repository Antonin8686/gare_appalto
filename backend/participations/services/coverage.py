from dataclasses import dataclass, field
from datetime import date
from typing import Any

from companies.models import Company

from tenders.models import Requirement, Tender
from tenders.services.evaluation import RequirementResult, evaluate_requirement
from tenders.services.requirement_matrix import ESITO_LABELS, ESITO_MAP, extract_values, map_esito

FORMA_SINGOLA = "singola"
FORMA_RTI = "rti"
FORMA_CONSORZIO = "consorzio"
FORMA_AVVALIMENTO = "avvalimento"

FORMA_LABELS = {
    FORMA_SINGOLA: "Partecipazione singola",
    FORMA_RTI: "RTI",
    FORMA_CONSORZIO: "Consorzio",
    FORMA_AVVALIMENTO: "Avvalimento",
}

ECONOMIC_KEYWORDS = ("fatturato", "patrimonio", "bilancio", "capitale", "indice")


@dataclass
class RequirementCoverage:
    requirement_id: int
    descrizione: str
    tipo: str
    categoria: str
    esito: str
    esito_label: str
    semaforo: str
    company_id: int | None
    company_name: str | None
    valore_posseduto: str
    valore_richiesto: str
    motivazione: str
    critico: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "requirement_id": self.requirement_id,
            "descrizione": self.descrizione,
            "tipo": self.tipo,
            "categoria": self.categoria,
            "esito": self.esito,
            "esito_label": self.esito_label,
            "semaforo": self.semaforo,
            "company_id": self.company_id,
            "company_name": self.company_name,
            "valore_posseduto": self.valore_posseduto,
            "valore_richiesto": self.valore_richiesto,
            "motivazione": self.motivazione,
            "critico": self.critico,
        }


@dataclass
class CoverageSummary:
    totale: int = 0
    soddisfatti: int = 0
    parziali: int = 0
    non_soddisfatti: int = 0
    percentuale: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "totale": self.totale,
            "soddisfatti": self.soddisfatti,
            "parziali": self.parziali,
            "non_soddisfatti": self.non_soddisfatti,
            "percentuale": self.percentuale,
        }


@dataclass
class ParticipationAnalysis:
    forma: str
    forma_label: str
    copertura: CoverageSummary
    requisiti: list[RequirementCoverage] = field(default_factory=list)
    criticita: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "forma": self.forma,
            "forma_label": self.forma_label,
            "copertura": self.copertura.to_dict(),
            "requisiti": [item.to_dict() for item in self.requisiti],
            "criticita": self.criticita,
        }


def _is_economic_requirement(req: Requirement) -> bool:
    text = f"{req.descrizione} {req.soglia_minima} {req.soglia}".lower()
    return req.tipo == Requirement.Tipo.ECONOMICO or any(
        keyword in text for keyword in ECONOMIC_KEYWORDS
    )


def _esito_rank(esito: str) -> int:
    return {"soddisfatto": 3, "parzialmente": 2, "non_soddisfatto": 1}.get(esito, 0)


def _merge_results(results: list[tuple[Company, RequirementResult]]) -> tuple[str, Company | None, RequirementResult]:
    if not results:
        raise ValueError("Nessun risultato da aggregare")

    best_company, best_result = max(
        results,
        key=lambda item: (_esito_rank(map_esito(item[1].esito)), item[1].esito == "verde"),
    )
    return map_esito(best_result.esito), best_company, best_result


def _evaluate_pooled_economic(
    companies: list[Company],
    req: Requirement,
    today: date,
) -> tuple[str, Company | None, RequirementResult, str]:
    results = [(company, evaluate_requirement(company, req, today)) for company in companies]
    best_esito, best_company, best_result = _merge_results(results)

    if best_esito == "soddisfatto":
        return best_esito, best_company, best_result, best_result.motivo

    greens = [item for item in results if item[1].esito == "verde"]
    if greens:
        company, result = greens[0]
        return map_esito(result.esito), company, result, result.motivo

    yellows = [item for item in results if item[1].esito == "giallo"]
    if yellows:
        company, result = yellows[0]
        pooled_note = (
            f"Requisito economico: valutazione combinata su {len(companies)} imprese del raggruppamento."
        )
        return "parzialmente", company, result, pooled_note

    company, result = results[0]
    return map_esito(result.esito), company, result, result.motivo


def _result_to_coverage(
    req: Requirement,
    esito: str,
    company: Company | None,
    result: RequirementResult,
    motivazione: str | None = None,
) -> RequirementCoverage:
    valore_posseduto, valore_richiesto = extract_values(result)
    semaforo = {"soddisfatto": "verde", "parzialmente": "giallo", "non_soddisfatto": "rosso"}[esito]
    critico = esito == "non_soddisfatto" and (
        req.obbligatorio or req.tipo == Requirement.Tipo.OBBLIGATORIO
    )
    return RequirementCoverage(
        requirement_id=req.id,
        descrizione=req.descrizione,
        tipo=req.tipo,
        categoria=req.categoria,
        esito=esito,
        esito_label=ESITO_LABELS[esito],
        semaforo=semaforo,
        company_id=company.id if company else None,
        company_name=company.name if company else None,
        valore_posseduto=valore_posseduto,
        valore_richiesto=valore_richiesto,
        motivazione=motivazione or result.motivo,
        critico=critico,
    )


def _build_summary(items: list[RequirementCoverage]) -> CoverageSummary:
    summary = CoverageSummary(totale=len(items))
    for item in items:
        if item.esito == "soddisfatto":
            summary.soddisfatti += 1
        elif item.esito == "parzialmente":
            summary.parziali += 1
        else:
            summary.non_soddisfatti += 1
    if summary.totale:
        summary.percentuale = round(
            (summary.soddisfatti + summary.parziali * 0.5) / summary.totale * 100,
            1,
        )
    return summary


def _build_criticita(items: list[RequirementCoverage]) -> list[dict[str, Any]]:
    criticita = []
    for item in items:
        if item.esito == "non_soddisfatto" or (item.esito == "parzialmente" and item.critico):
            criticita.append(
                {
                    "requirement_id": item.requirement_id,
                    "descrizione": item.descrizione,
                    "esito": item.esito,
                    "esito_label": item.esito_label,
                    "motivazione": item.motivazione,
                    "company_name": item.company_name,
                    "severita": "alta" if item.esito == "non_soddisfatto" else "media",
                }
            )
        elif item.esito == "parzialmente":
            criticita.append(
                {
                    "requirement_id": item.requirement_id,
                    "descrizione": item.descrizione,
                    "esito": item.esito,
                    "esito_label": item.esito_label,
                    "motivazione": item.motivazione,
                    "company_name": item.company_name,
                    "severita": "bassa",
                }
            )
    return criticita


def analyze_participation(
    tender: Tender,
    *,
    forma: str,
    companies: list[Company],
    ripartizione_requisiti: dict[int, int] | None = None,
    avvalimenti: list[dict[str, Any]] | None = None,
    today: date | None = None,
) -> ParticipationAnalysis:
    today = today or date.today()
    ripartizione = {int(k): int(v) for k, v in (ripartizione_requisiti or {}).items()}
    company_map = {company.id: company for company in companies}
    avvalimenti = avvalimenti or []

    avvalimento_map: dict[int, list[int]] = {}
    for item in avvalimenti:
        principal_id = int(item["impresa_principale_id"])
        auxiliary_id = int(item["impresa_ausiliaria_id"])
        for req_id in item.get("requisiti_coperti", []):
            avvalimento_map.setdefault(int(req_id), []).append(auxiliary_id)

    requirements = list(tender.requirements.all().order_by("tipo", "categoria", "id"))
    coverages: list[RequirementCoverage] = []

    for req in requirements:
        assigned_id = ripartizione.get(req.id)
        pool = companies

        if assigned_id and assigned_id in company_map:
            eval_companies = [company_map[assigned_id]]
        elif forma in (FORMA_RTI, FORMA_CONSORZIO) and len(companies) > 1:
            eval_companies = companies
        else:
            eval_companies = companies[:1] if companies else []

        if not eval_companies:
            coverages.append(
                RequirementCoverage(
                    requirement_id=req.id,
                    descrizione=req.descrizione,
                    tipo=req.tipo,
                    categoria=req.categoria,
                    esito="non_soddisfatto",
                    esito_label=ESITO_LABELS["non_soddisfatto"],
                    semaforo="rosso",
                    company_id=None,
                    company_name=None,
                    valore_posseduto="—",
                    valore_richiesto=req.soglia_minima or req.soglia or "—",
                    motivazione="Nessuna impresa selezionata per la valutazione.",
                    critico=True,
                )
            )
            continue

        auxiliary_ids = avvalimento_map.get(req.id, [])
        auxiliary_companies = [
            company_map[aux_id] for aux_id in auxiliary_ids if aux_id in company_map
        ]
        eval_pool = list(dict.fromkeys(eval_companies + auxiliary_companies))

        if forma in (FORMA_RTI, FORMA_CONSORZIO) and _is_economic_requirement(req) and len(eval_pool) > 1:
            esito, company, result, motivazione = _evaluate_pooled_economic(eval_pool, req, today)
        else:
            results = [
                (company, evaluate_requirement(company, req, today)) for company in eval_pool
            ]
            esito, company, result = _merge_results(results)
            motivazione = result.motivo
            if auxiliary_companies and esito == "soddisfatto":
                motivazione = (
                    f"{result.motivo} Copertura anche tramite impresa ausiliaria."
                )

        coverages.append(_result_to_coverage(req, esito, company, result, motivazione))

    summary = _build_summary(coverages)
    return ParticipationAnalysis(
        forma=forma,
        forma_label=FORMA_LABELS.get(forma, forma),
        copertura=summary,
        requisiti=coverages,
        criticita=_build_criticita(coverages),
    )
