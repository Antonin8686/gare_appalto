from typing import Any

from ..models import TechnicalOffer


def build_rag_payload(offer: TechnicalOffer) -> dict[str, Any]:
    parole_chiave = offer.parole_chiave or []
    tags = offer.tags or []
    keywords = list(dict.fromkeys([*parole_chiave, *tags]))

    metadata: dict[str, Any] = {
        "id": offer.id,
        "title": offer.title,
        "category": offer.category,
        "category_label": offer.get_category_display(),
        "settore": offer.settore,
        "settore_label": offer.get_settore_display() if offer.settore else "",
        "tipologia_servizio": offer.tipologia_servizio,
        "ente_appaltante": offer.ente_appaltante,
        "valore_appalto": str(offer.valore_appalto) if offer.valore_appalto is not None else None,
        "durata": offer.durata,
        "anno": offer.anno,
        "punteggio_ottenuto": (
            str(offer.punteggio_ottenuto) if offer.punteggio_ottenuto is not None else None
        ),
        "parole_chiave": keywords,
        "riutilizzabilita": offer.riutilizzabilita,
        "innovativita": offer.innovativita,
        "organization_id": offer.organization_id,
        "updated_at": offer.updated_at.isoformat() if offer.updated_at else None,
    }

    text_sections = [
        f"# {offer.title}",
        f"Categoria: {offer.get_category_display()}",
    ]
    if offer.settore:
        text_sections.append(f"Settore: {offer.get_settore_display()}")
    if offer.tipologia_servizio:
        text_sections.append(f"Tipologia servizio: {offer.tipologia_servizio}")
    if offer.ente_appaltante:
        text_sections.append(f"Ente appaltante: {offer.ente_appaltante}")
    if offer.valore_appalto is not None:
        text_sections.append(f"Valore appalto: {offer.valore_appalto}")
    if offer.durata:
        text_sections.append(f"Durata: {offer.durata}")
    if offer.anno:
        text_sections.append(f"Anno: {offer.anno}")
    if offer.punteggio_ottenuto is not None:
        text_sections.append(f"Punteggio ottenuto: {offer.punteggio_ottenuto}")
    if keywords:
        text_sections.append(f"Parole chiave: {', '.join(keywords)}")
    if offer.riutilizzabilita:
        text_sections.append(f"Riutilizzabilità: {offer.riutilizzabilita}/5")
    if offer.innovativita:
        text_sections.append(f"Innovatività: {offer.innovativita}/5")
    if offer.content:
        text_sections.append(offer.content.strip())

    return {
        "text": "\n\n".join(section for section in text_sections if section),
        "metadata": metadata,
    }
