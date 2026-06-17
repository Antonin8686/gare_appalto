from dataclasses import dataclass, field
from datetime import date
from typing import Any

from companies.models import Company
from django.db.models import Q

from ..models import Requirement, Tender
from .evaluation import RequirementResult, evaluate_requirement

ESITO_MAP = {
    "verde": "soddisfatto",
    "giallo": "parzialmente",
    "rosso": "non_soddisfatto",
}

ESITO_LABELS = {
    "soddisfatto": "Soddisfatto",
    "parzialmente": "Soddisfatto parzialmente",
    "non_soddisfatto": "Non soddisfatto",
}

ESITO_SEMAFORO = {
    "soddisfatto": "verde",
    "parzialmente": "giallo",
    "non_soddisfatto": "rosso",
}


@dataclass
class MatrixCell:
    company_id: int
    company_name: str
    esito: str
    esito_label: str
    semaforo: str
    valore_posseduto: str
    valore_richiesto: str
    motivazione: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "company_id": self.company_id,
            "company_name": self.company_name,
            "esito": self.esito,
            "esito_label": self.esito_label,
            "semaforo": self.semaforo,
            "valore_posseduto": self.valore_posseduto,
            "valore_richiesto": self.valore_richiesto,
            "motivazione": self.motivazione,
        }


@dataclass
class MatrixRequirementRow:
    requirement_id: int
    tipo: str
    tipo_label: str
    categoria: str
    categoria_label: str
    descrizione: str
    soglia_minima: str
    cells: list[MatrixCell] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "requirement_id": self.requirement_id,
            "tipo": self.tipo,
            "tipo_label": self.tipo_label,
            "categoria": self.categoria,
            "categoria_label": self.categoria_label,
            "descrizione": self.descrizione,
            "soglia_minima": self.soglia_minima,
            "cells": [cell.to_dict() for cell in self.cells],
        }


@dataclass
class RequirementMatrix:
    tender_id: int
    tender_cig: str
    companies: list[dict[str, Any]]
    requirements: list[MatrixRequirementRow]
    summary: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        return {
            "tender_id": self.tender_id,
            "tender_cig": self.tender_cig,
            "companies": self.companies,
            "requirements": [row.to_dict() for row in self.requirements],
            "summary": self.summary,
        }


def map_esito(esito: str) -> str:
    return ESITO_MAP.get(esito, "parzialmente")


def extract_values(result: RequirementResult) -> tuple[str, str]:
    evidenza = result.evidenza or {}
    soglia = result.soglia or "—"

    if "fatturato" in evidenza:
        posseduto = f"€ {evidenza['fatturato']}"
        if "confronto" in evidenza:
            posseduto = f"€ {evidenza['confronto']} (annuo € {evidenza['fatturato']})"
        return posseduto, soglia if soglia != "—" else "Soglia economica"

    if "totale_dipendenti" in evidenza:
        posseduto = f"{evidenza['totale_dipendenti']} unità"
        richiesto = (
            f"min. {evidenza['minimo']}"
            if "minimo" in evidenza
            else (soglia if soglia != "—" else "Minimo non specificato")
        )
        return posseduto, richiesto

    if "certificazioni" in evidenza:
        return str(evidenza["certificazioni"]), soglia or "Certificazione richiesta"

    if "esperienza" in evidenza:
        return str(evidenza["esperienza"]), soglia or "Esperienza pertinente"

    if "esperienze_count" in evidenza:
        return (
            f"{evidenza['esperienze_count']} esperienze dichiarate",
            soglia or "Esperienza pertinente",
        )

    if "servizio" in evidenza:
        return str(evidenza["servizio"]), soglia or "—"

    if "servizi" in evidenza:
        return str(evidenza["servizi"]), soglia or "—"

    if evidenza:
        posseduto = "; ".join(f"{key}: {value}" for key, value in evidenza.items())
        return posseduto, soglia if soglia != "—" else "—"

    return "—", soglia if soglia != "—" else "—"


def _result_to_cell(company: Company, result: RequirementResult) -> MatrixCell:
    esito = map_esito(result.esito)
    valore_posseduto, valore_richiesto = extract_values(result)
    return MatrixCell(
        company_id=company.id,
        company_name=company.name,
        esito=esito,
        esito_label=ESITO_LABELS[esito],
        semaforo=ESITO_SEMAFORO[esito],
        valore_posseduto=valore_posseduto,
        valore_richiesto=valore_richiesto,
        motivazione=result.motivo,
    )


def _filter_requirements(
    requirements: list[Requirement],
    *,
    query: str = "",
    categoria: str = "",
    tipo: str = "",
) -> list[Requirement]:
    filtered = requirements

    if categoria:
        filtered = [req for req in filtered if req.categoria == categoria]

    if tipo:
        filtered = [req for req in filtered if req.tipo == tipo]

    if query:
        lowered = query.lower()
        filtered = [
            req
            for req in filtered
            if lowered in req.descrizione.lower()
            or lowered in (req.soglia_minima or "").lower()
            or lowered in (req.note_interpretative or "").lower()
            or lowered in (req.documento_origine or "").lower()
        ]

    return filtered


def build_requirement_matrix(
    tender: Tender,
    companies: list[Company],
    *,
    query: str = "",
    categoria: str = "",
    tipo: str = "",
    esito: str = "",
    company_ids: list[int] | None = None,
    today: date | None = None,
) -> RequirementMatrix:
    today = today or date.today()

    if company_ids:
        company_set = set(company_ids)
        companies = [company for company in companies if company.id in company_set]

    requirements = list(
        Requirement.objects.filter(tender=tender)
        .select_related("document")
        .order_by("tipo", "categoria", "id")
    )
    requirements = _filter_requirements(
        requirements,
        query=query,
        categoria=categoria,
        tipo=tipo,
    )

    summary = {"soddisfatto": 0, "parzialmente": 0, "non_soddisfatto": 0}
    rows: list[MatrixRequirementRow] = []

    for req in requirements:
        cells: list[MatrixCell] = []
        for company in companies:
            result = evaluate_requirement(company, req, today=today)
            cell = _result_to_cell(company, result)
            cells.append(cell)
            summary[cell.esito] = summary.get(cell.esito, 0) + 1

        if esito and not any(cell.esito == esito for cell in cells):
            continue

        rows.append(
            MatrixRequirementRow(
                requirement_id=req.id,
                tipo=req.tipo,
                tipo_label=req.get_tipo_display(),
                categoria=req.categoria,
                categoria_label=req.get_categoria_display(),
                descrizione=req.descrizione,
                soglia_minima=req.soglia_minima or req.soglia,
                cells=cells,
            )
        )

    return RequirementMatrix(
        tender_id=tender.id,
        tender_cig=tender.cig,
        companies=[{"id": company.id, "name": company.name} for company in companies],
        requirements=rows,
        summary=summary,
    )


def requirement_matrix_queryset_filter(queryset, query: str):
    if not query:
        return queryset
    return queryset.filter(
        Q(descrizione__icontains=query)
        | Q(soglia_minima__icontains=query)
        | Q(note_interpretative__icontains=query)
        | Q(documento_origine__icontains=query)
    )
