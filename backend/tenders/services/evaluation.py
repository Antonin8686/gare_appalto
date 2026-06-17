import re
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any

from companies.models import Company

from ..models import Requirement, Tender
from .extraction import parse_importo

MINIMO_PATTERN = re.compile(r"minimo\s+(\d+)", re.IGNORECASE)
ISO_PATTERN = re.compile(r"iso\s*(\d{4,5}(?::\d{4})?)", re.IGNORECASE)
FATTURATO_KEYWORDS = ("fatturato", "fatturazione", "ricavi")
PERSONALE_KEYWORDS = ("personale", "dipendent", "operai", "tecnici", "unità")
CERTIFICAZIONE_KEYWORDS = ("certificaz", "iso", "qualità", "ambiente", "sicurezza")
ESPERIENZA_KEYWORDS = ("esperienz", "appalt", "serviz", "lavor", "contratt")
SERVIZIO_KEYWORDS = ("serviz", "attività", "prestaz")


@dataclass
class RequirementResult:
    requirement_id: int
    tipo: str
    descrizione: str
    soglia: str
    esito: str
    motivo: str
    evidenza: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "requirement_id": self.requirement_id,
            "tipo": self.tipo,
            "descrizione": self.descrizione,
            "soglia": self.soglia,
            "esito": self.esito,
            "motivo": self.motivo,
            "evidenza": self.evidenza,
        }


@dataclass
class EvaluationResult:
    semaforo: str
    motivazione: str
    dettagli: list[RequirementResult] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "semaforo": self.semaforo,
            "motivazione": self.motivazione,
            "dettagli": [item.to_dict() for item in self.dettagli],
        }


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def _parse_minimo(soglia: str, descrizione: str) -> int | None:
    for source in (soglia, descrizione):
        if match := MINIMO_PATTERN.search(source):
            return int(match.group(1))
    return None


def _parse_soglia_importo(soglia: str, descrizione: str) -> Decimal | None:
    for source in (soglia, descrizione):
        if "€" in source or re.search(r"\d[\d.\s]*,\d{2}", source):
            cleaned = re.sub(r"[^\d,.\s]", "", source)
            if value := parse_importo(cleaned):
                return value
    return None


def _certificazione_valida(cert: dict, iso_code: str | None, today: date) -> bool:
    nome = str(cert.get("nome", "")).lower()
    if iso_code and iso_code.lower() not in nome:
        return False
    scadenza_raw = cert.get("scadenza")
    if not scadenza_raw:
        return True
    try:
        scadenza = date.fromisoformat(str(scadenza_raw))
    except ValueError:
        return True
    return scadenza >= today


def _requirement_soglia_text(req: Requirement) -> str:
    return f"{req.soglia_minima} {req.soglia} {req.descrizione}".strip()


def _evaluate_fatturato(company: Company, req: Requirement) -> RequirementResult:
    soglia = _parse_soglia_importo(req.soglia_minima, _requirement_soglia_text(req))
    base = {
        "requirement_id": req.id,
        "tipo": req.tipo,
        "descrizione": req.descrizione,
        "soglia": req.soglia_minima or req.soglia,
    }

    if soglia is None:
        return RequirementResult(
            **base,
            esito="giallo",
            motivo="Soglia economica non interpretabile automaticamente.",
        )

    if company.fatturato is None:
        return RequirementResult(
            **base,
            esito="rosso" if req.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo",
            motivo="Fatturato annuo non indicato nel profilo azienda.",
        )

    fatturato = company.fatturato
    is_triennale = "triennal" in (req.descrizione + req.soglia).lower()
    confronto = fatturato * 3 if is_triennale else fatturato

    if confronto >= soglia:
        periodo = "triennale stimato" if is_triennale else "annuo"
        return RequirementResult(
            **base,
            esito="verde",
            motivo=f"Fatturato {periodo} €{confronto:,.2f} ≥ soglia €{soglia:,.2f}.",
            evidenza={"fatturato": str(fatturato), "confronto": str(confronto)},
        )

    if is_triennale:
        return RequirementResult(
            **base,
            esito="giallo",
            motivo=(
                f"Fatturato triennale stimato €{confronto:,.2f} inferiore alla soglia "
                f"€{soglia:,.2f} — verificare i dati contabili ufficiali."
            ),
            evidenza={"fatturato": str(fatturato), "confronto": str(confronto)},
        )

    esito = "rosso" if req.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo"
    return RequirementResult(
        **base,
        esito=esito,
        motivo=f"Fatturato annuo €{fatturato:,.2f} inferiore alla soglia €{soglia:,.2f}.",
        evidenza={"fatturato": str(fatturato)},
    )


def _evaluate_certificazione(
    company: Company,
    req: Requirement,
    today: date,
) -> RequirementResult:
    base = {
        "requirement_id": req.id,
        "tipo": req.tipo,
        "descrizione": req.descrizione,
        "soglia": req.soglia_minima or req.soglia,
    }
    iso_match = ISO_PATTERN.search(req.descrizione + " " + req.soglia)
    iso_code = iso_match.group(1) if iso_match else None

    certificazioni = company.certificazioni or []
    valide = [
        cert
        for cert in certificazioni
        if isinstance(cert, dict) and _certificazione_valida(cert, iso_code, today)
    ]

    if valide:
        nomi = ", ".join(str(c.get("nome", "")) for c in valide[:3])
        return RequirementResult(
            **base,
            esito="verde",
            motivo=f"Certificazione presente e valida: {nomi}.",
            evidenza={"certificazioni": nomi},
        )

    if certificazioni:
        return RequirementResult(
            **base,
            esito="rosso" if req.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo",
            motivo="Certificazioni presenti ma non conformi o scadute rispetto al requisito.",
        )

    return RequirementResult(
        **base,
        esito="rosso" if req.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo",
        motivo="Nessuna certificazione corrispondente nel profilo azienda.",
    )


def _evaluate_personale(company: Company, req: Requirement) -> RequirementResult:
    base = {
        "requirement_id": req.id,
        "tipo": req.tipo,
        "descrizione": req.descrizione,
        "soglia": req.soglia_minima or req.soglia,
    }
    minimo = _parse_minimo(req.soglia, req.descrizione)
    dipendenti = company.dipendenti or []
    totale = sum(
        int(item.get("numero", 0))
        for item in dipendenti
        if isinstance(item, dict)
    )

    if minimo is None:
        if totale > 0:
            return RequirementResult(
                **base,
                esito="verde",
                motivo=f"Personale dichiarato: {totale} unità.",
                evidenza={"totale_dipendenti": totale},
            )
        return RequirementResult(
            **base,
            esito="giallo",
            motivo="Numero minimo di personale non specificato o dati assenti.",
        )

    if totale >= minimo:
        return RequirementResult(
            **base,
            esito="verde",
            motivo=f"Personale dichiarato ({totale}) ≥ minimo richiesto ({minimo}).",
            evidenza={"totale_dipendenti": totale, "minimo": minimo},
        )

    esito = "rosso" if req.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo"
    return RequirementResult(
        **base,
        esito=esito,
        motivo=f"Personale dichiarato ({totale}) inferiore al minimo richiesto ({minimo}).",
        evidenza={"totale_dipendenti": totale, "minimo": minimo},
    )


def _evaluate_esperienza(company: Company, req: Requirement) -> RequirementResult:
    base = {
        "requirement_id": req.id,
        "tipo": req.tipo,
        "descrizione": req.descrizione,
        "soglia": req.soglia_minima or req.soglia,
    }
    esperienze = company.esperienze or []
    if not esperienze:
        return RequirementResult(
            **base,
            esito="rosso" if req.tipo == Requirement.Tipo.OBBLIGATORIO else "giallo",
            motivo="Nessuna esperienza pregressa indicata nel profilo azienda.",
        )

    req_words = {
        word
        for word in re.findall(r"\w{4,}", req.descrizione.lower())
        if word not in {"requisito", "tecnico", "obbligatorio", "economico", "minimo"}
    }

    for exp in esperienze:
        if not isinstance(exp, dict):
            continue
        testo = " ".join(
            str(exp.get(key, ""))
            for key in ("titolo", "committente", "descrizione")
        ).lower()
        if any(word in testo for word in req_words):
            titolo = exp.get("titolo", "Esperienza")
            return RequirementResult(
                **base,
                esito="verde",
                motivo=f"Esperienza pertinente trovata: {titolo}.",
                evidenza={"esperienza": titolo},
            )

    count = len([e for e in esperienze if isinstance(e, dict)])
    return RequirementResult(
        **base,
        esito="giallo",
        motivo=f"Presenti {count} esperienze ma nessuna chiaramente pertinente al requisito.",
        evidenza={"esperienze_count": count},
    )


def _evaluate_servizio(company: Company, req: Requirement) -> RequirementResult:
    base = {
        "requirement_id": req.id,
        "tipo": req.tipo,
        "descrizione": req.descrizione,
        "soglia": req.soglia_minima or req.soglia,
    }
    servizi = [str(s).lower() for s in (company.servizi or [])]
    if not servizi:
        return RequirementResult(
            **base,
            esito="giallo",
            motivo="Nessun servizio indicato nel profilo azienda.",
        )

    req_words = {
        word
        for word in re.findall(r"\w{4,}", req.descrizione.lower())
        if word not in {"requisito", "tecnico", "servizio", "servizi", "attività"}
    }

    for servizio in servizi:
        if any(word in servizio for word in req_words):
            return RequirementResult(
                **base,
                esito="verde",
                motivo=f"Servizio pertinente presente: {servizio}.",
                evidenza={"servizio": servizio},
            )

    return RequirementResult(
        **base,
        esito="giallo",
        motivo="Servizi dichiarati ma nessuna corrispondenza evidente col requisito.",
        evidenza={"servizi": ", ".join(servizi[:5])},
    )


def _evaluate_obbligatorio_generico(company: Company, req: Requirement) -> RequirementResult:
    base = {
        "requirement_id": req.id,
        "tipo": req.tipo,
        "descrizione": req.descrizione,
        "soglia": req.soglia_minima or req.soglia,
    }
    soglia = req.soglia.lower()
    if "iscrizione" in req.descrizione.lower() or "camera" in req.descrizione.lower():
        return RequirementResult(
            **base,
            esito="giallo",
            motivo="Requisito amministrativo: verifica manuale dell'iscrizione richiesta.",
        )
    if soglia and "attiv" in soglia:
        return RequirementResult(
            **base,
            esito="giallo",
            motivo="Requisito formale obbligatorio: conferma manuale necessaria.",
        )
    return RequirementResult(
        **base,
        esito="giallo",
        motivo="Requisito obbligatorio non verificabile automaticamente con i dati disponibili.",
    )


def evaluate_requirement(
    company: Company,
    req: Requirement,
    today: date | None = None,
) -> RequirementResult:
    today = today or date.today()
    text = f"{req.descrizione} {req.soglia}".lower()

    if _contains_any(text, FATTURATO_KEYWORDS):
        return _evaluate_fatturato(company, req)
    if _contains_any(text, CERTIFICAZIONE_KEYWORDS) or ISO_PATTERN.search(text):
        return _evaluate_certificazione(company, req, today)
    if _contains_any(text, PERSONALE_KEYWORDS):
        return _evaluate_personale(company, req)
    if _contains_any(text, ESPERIENZA_KEYWORDS):
        return _evaluate_esperienza(company, req)
    if _contains_any(text, SERVIZIO_KEYWORDS):
        return _evaluate_servizio(company, req)
    if req.tipo == Requirement.Tipo.OBBLIGATORIO:
        return _evaluate_obbligatorio_generico(company, req)

    return RequirementResult(
        requirement_id=req.id,
        tipo=req.tipo,
        descrizione=req.descrizione,
        soglia=req.soglia,
        esito="giallo",
        motivo="Requisito non classificabile automaticamente — verifica manuale consigliata.",
    )


def aggregate_semaforo(results: list[RequirementResult]) -> str:
    if not results:
        return "giallo"

    esiti = [r.esito for r in results]
    obbligatori = [r for r in results if r.tipo == Requirement.Tipo.OBBLIGATORIO]

    if any(r.esito == "rosso" for r in obbligatori):
        return "rosso"
    if any(r.esito == "rosso" for r in results):
        return "rosso"
    if any(e == "giallo" for e in esiti):
        return "giallo"
    return "verde"


def build_motivazione(semaforo: str, results: list[RequirementResult]) -> str:
    counts = {"verde": 0, "giallo": 0, "rosso": 0}
    for result in results:
        counts[result.esito] = counts.get(result.esito, 0) + 1

    total = len(results)
    if total == 0:
        return "Nessun requisito da valutare per questa gara."

    if semaforo == "verde":
        return f"Compatibile: tutti i {total} requisiti risultano soddisfatti."

    if semaforo == "rosso":
        critici = [r for r in results if r.esito == "rosso"]
        if critici:
            first = critici[0]
            extra = len(critici) - 1
            suffix = f" e altri {extra} requisiti critici" if extra > 0 else ""
            return f"Non compatibile: {first.descrizione[:80]}{suffix}."
        return f"Non compatibile: {counts['rosso']} requisiti non soddisfatti."

    parti = []
    if counts["giallo"]:
        parti.append(f"{counts['giallo']} da verificare")
    if counts["rosso"]:
        parti.append(f"{counts['rosso']} non soddisfatti")
    detail = ", ".join(parti)
    return f"Parzialmente compatibile: {detail} su {total} requisiti."


def evaluate_company_for_tender(company: Company, tender: Tender) -> EvaluationResult:
    requirements = list(tender.requirements.all())
    results = [evaluate_requirement(company, req) for req in requirements]
    semaforo = aggregate_semaforo(results)
    motivazione = build_motivazione(semaforo, results)
    return EvaluationResult(semaforo=semaforo, motivazione=motivazione, dettagli=results)
