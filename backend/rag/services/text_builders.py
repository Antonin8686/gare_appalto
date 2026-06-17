from __future__ import annotations

import json
from typing import Any

from companies.models import Company
from tenders.models import Document, Requirement
from technical_offers.models import TechnicalOffer


def build_requirement_text(requirement: Requirement) -> str:
    sections = [
        f"Requisito {requirement.get_tipo_display()}",
        f"Categoria: {requirement.get_categoria_display()}",
        requirement.descrizione.strip(),
    ]
    if requirement.soglia:
        sections.append(f"Soglia: {requirement.soglia}")
    if requirement.soglia_minima:
        sections.append(f"Soglia minima: {requirement.soglia_minima}")
    if requirement.modalita_comprova:
        sections.append(f"Modalità di comprova: {requirement.modalita_comprova}")
    if requirement.soggetto_obbligato:
        sections.append(f"Soggetto obbligato: {requirement.soggetto_obbligato}")
    if requirement.note_interpretative:
        sections.append(f"Note: {requirement.note_interpretative}")
    flags = []
    if requirement.obbligatorio:
        flags.append("obbligatorio")
    if requirement.premiante:
        flags.append("premiante")
    if requirement.migliorativo:
        flags.append("migliorativo")
    if requirement.avvalimento_consentito:
        flags.append("avvalimento consentito")
    if requirement.rti_consentito:
        flags.append("RTI consentito")
    if requirement.consorzio_consentito:
        flags.append("consorzio consentito")
    if flags:
        sections.append(f"Caratteristiche: {', '.join(flags)}")
    return "\n\n".join(section for section in sections if section)


def build_company_text(company: Company) -> str:
    sections = [
        f"# {company.name}",
        f"Partita IVA: {company.partita_iva}" if company.partita_iva else "",
        f"Codice fiscale: {company.codice_fiscale}" if company.codice_fiscale else "",
    ]
    if company.forma_giuridica:
        sections.append(f"Forma giuridica: {company.get_forma_giuridica_display()}")
    if company.oggetto_sociale:
        sections.append(f"Oggetto sociale: {company.oggetto_sociale.strip()}")
    if company.ccnl:
        sections.append(f"CCNL: {company.ccnl}")
    if company.fatturato is not None:
        sections.append(f"Fatturato annuo: {company.fatturato}")

    for label, payload in (
        ("Codici ATECO", company.codici_ateco),
        ("Sedi legali", company.sedi_legali),
        ("Sedi operative", company.sedi_operative),
        ("Autorizzazioni", company.autorizzazioni),
        ("Licenze", company.licenze),
        ("Attestazioni SOA", company.attestazioni_soa),
        ("Certificazioni", company.certificazioni),
        ("Servizi", company.servizi),
        ("Esperienze", company.esperienze),
        ("Dipendenti", company.dipendenti),
        ("Presenza territoriale", company.presenza_territoriale),
        ("Polizze assicurative", company.polizze_assicurative),
        ("Referenze bancarie", company.referenze_bancarie),
    ):
        if payload:
            sections.append(f"{label}:\n{_format_json_block(payload)}")

    if company.rating_legalita:
        sections.append(f"Rating legalità:\n{_format_json_block(company.rating_legalita)}")
    if company.iscrizione_cciaa:
        sections.append(f"Iscrizione CCIAA:\n{_format_json_block(company.iscrizione_cciaa)}")

    return "\n\n".join(section for section in sections if section)


def build_technical_offer_text(offer: TechnicalOffer) -> str:
    if offer.rag_text.strip():
        return offer.rag_text.strip()
    from technical_offers.services.rag_index import build_rag_payload

    return build_rag_payload(offer)["text"]


def build_tender_document_text(document: Document) -> str:
    header = document.name or document.original_filename
    body = document.text_content.strip()
    if not body:
        return ""
    return f"# {header}\n\n{body}"


def _format_json_block(value: Any) -> str:
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value)
