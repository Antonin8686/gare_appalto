from __future__ import annotations

from ..constants import AiActionType


def build_system_prompt() -> str:
    return (
        "Sei un assistente esperto nella redazione di relazioni tecniche per gare d'appalto "
        "pubbliche italiane. Rispondi sempre in italiano, con tono professionale e preciso. "
        "DEVI basarti esclusivamente sulle fonti fornite nel contesto RAG. "
        "Non inventare requisiti, certificazioni o esperienze non presenti nelle fonti. "
        "Concludi SEMPRE la risposta con una sezione markdown:\n\n"
        "## Fonti utilizzate\n"
        "- [n] Titolo fonte — breve motivo dell'utilizzo\n"
        "Elenca tutte le fonti RAG effettivamente usate, con il numero di riferimento [n]."
    )


def build_user_prompt(
    *,
    action: str,
    context_block: str,
    section_title: str = "",
    section_content: str = "",
    criterion_description: str = "",
    instructions: str = "",
    tender_cig: str = "",
    company_name: str = "",
) -> str:
    header = [
        f"Azione richiesta: {AiActionType.LABELS.get(action, action)}",
    ]
    if tender_cig:
        header.append(f"Gara CIG: {tender_cig}")
    if company_name:
        header.append(f"Azienda: {company_name}")
    if section_title:
        header.append(f"Sezione: {section_title}")
    if criterion_description:
        header.append(f"Criterio di valutazione: {criterion_description}")
    if instructions:
        header.append(f"Istruzioni aggiuntive: {instructions}")

    header.append("")
    header.append(context_block)
    header.append("")

    if action == AiActionType.TECHNICAL_CRITERION:
        header.append(
            "Genera il contenuto tecnico per la sezione indicata, in markdown, "
            "strutturato con sottotitoli, punti elenco dove utile e riferimenti espliciti "
            "alle fonti [n]. Non superare il tono promozionale: resta tecnico e verificabile."
        )
    elif action == AiActionType.IMPROVEMENT_PROPOSAL:
        header.append("Contenuto attuale della sezione:")
        header.append(section_content or "(vuoto)")
        header.append("")
        header.append(
            "Proponi migliorie concrete al contenuto: cosa aggiungere, cosa chiarire, "
            "cosa rendere più convincente rispetto ai criteri. Fornisci suggerimenti puntuali "
            "con riferimenti alle fonti [n]."
        )
    elif action == AiActionType.CONTENT_ADAPTATION:
        header.append("Contenuto da adattare:")
        header.append(section_content or "(vuoto)")
        header.append("")
        header.append(
            "Adatta il contenuto al contesto della gara e dell'azienda usando le fonti RAG. "
            "Mantieni la struttura ma personalizza dati, esperienze e riferimenti verificabili. "
            "Output in markdown con citazioni [n]."
        )
    elif action == AiActionType.REPORT_STRUCTURE:
        header.append(
            "Proponi la struttura della relazione tecnica: elenco sezioni con titolo, "
            "categoria, pagine suggerite e breve descrizione del contenuto atteso. "
            "Usa markdown con titoli ## per ogni sezione proposta e cita le fonti [n] "
            "che giustificano ogni scelta strutturale."
        )
    else:
        header.append("Esegui l'azione richiesta citando sempre le fonti [n].")

    return "\n".join(header)
