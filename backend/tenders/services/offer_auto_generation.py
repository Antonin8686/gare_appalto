"""Generazione automatica offerte tecnica ed economica post-analisi documenti."""

from __future__ import annotations

from technical_offers.services.library_retrieval import (
    best_library_match_for_section,
    build_section_content_from_library,
)

from ..models import EvaluationCriterion, Tender
from .economic_outline_generation import (
    apply_outline_to_economic_relation,
    generate_economic_relation_outline,
    get_or_create_economic_relation,
)
from .outline_generation import (
    apply_outline_to_relation,
    generate_technical_relation_outline,
    get_or_create_technical_relation,
)


def _criteria_by_title(tender: Tender) -> dict[str, EvaluationCriterion]:
    mapping: dict[str, EvaluationCriterion] = {}
    for criterion in EvaluationCriterion.objects.filter(tender=tender):
        mapping[criterion.titolo.strip().lower()] = criterion
    return mapping


def _build_technical_section_content(
    *,
    title: str,
    category: str,
    criterion: EvaluationCriterion | None,
    tender: Tender,
) -> str:
    lines = [f"# {title}", ""]
    if criterion and criterion.descrizione:
        lines.append(criterion.descrizione.strip())
    elif category:
        lines.append(f"Categoria: {category.replace('_', ' ')}.")

    if criterion and criterion.punteggio_massimo is not None:
        lines.extend(["", f"**Punteggio massimo:** {criterion.punteggio_massimo}"])

    if criterion and criterion.soglia_minima:
        lines.extend(["", f"**Soglia minima:** {criterion.soglia_minima}"])

    if tender.oggetto:
        lines.extend(["", f"**Oggetto gara:** {tender.oggetto.strip()}"])

    lines.extend(
        [
            "",
            "## Proposta",
            "",
            "Descrivere in questa sezione l'approccio operativo, le risorse impiegate "
            "e gli elementi distintivi dell'offerta in relazione al criterio indicato.",
        ]
    )
    return "\n".join(lines).strip()


def auto_fill_technical_content(relation, tender: Tender) -> None:
    criteria_map = _criteria_by_title(tender)
    sections = []
    for section in relation.sections or []:
        if str(section.get("content", "")).strip():
            sections.append(section)
            continue

        title = str(section.get("title", "")).strip()
        criterion = criteria_map.get(title.lower())
        if criterion is None:
            for key, value in criteria_map.items():
                if key in title.lower() or title.lower() in key:
                    criterion = value
                    break

        category = str(section.get("category", ""))
        library_match = best_library_match_for_section(
            organization=tender.organization,
            section_title=title,
            category=category,
            tender_oggetto=tender.oggetto or "",
        )
        if library_match and library_match.get("content"):
            content = build_section_content_from_library(
                library_content=library_match["content"],
                section_title=title,
                source_title=library_match.get("title", ""),
                criterion_description=(criterion.descrizione if criterion else ""),
                punteggio_massimo=criterion.punteggio_massimo if criterion else None,
                soglia_minima=criterion.soglia_minima if criterion else "",
                tender_oggetto=tender.oggetto or "",
            )
        else:
            content = _build_technical_section_content(
                title=title,
                category=category,
                criterion=criterion,
                tender=tender,
            )
        sections.append(
            {
                **section,
                "content": content,
                "completed": True,
                "library_source_id": library_match.get("offer_id") if library_match else None,
            }
        )

    relation.sections = sections
    relation.save(update_fields=["sections", "updated_at"])


def auto_fill_economic_content(relation, tender: Tender) -> None:
    outline = relation.outline or {}
    importo_base = str(outline.get("importo_base", "") or tender.importo or "")
    pricing_model = outline.get("pricing_model", "a_corpo")

    line_items = []
    for item in relation.line_items or []:
        updated = dict(item)
        if not str(updated.get("prezzo_unitario", "")).strip() and importo_base and updated.get("order") == 1:
            updated["prezzo_unitario"] = importo_base
        if not str(updated.get("importo", "")).strip():
            qty = str(updated.get("quantita", "1")).replace(",", ".")
            price = str(updated.get("prezzo_unitario", "")).replace(",", ".")
            try:
                from decimal import Decimal

                amount = Decimal(qty) * Decimal(price)
                updated["importo"] = f"{amount.quantize(Decimal('0.01'))}"
            except Exception:
                pass
        if pricing_model == "ribasso_percentuale" and not updated.get("notes"):
            updated["notes"] = "Compilare il ribasso percentuale sul modello B."
        updated["completed"] = bool(str(updated.get("importo", "")).strip())
        line_items.append(updated)

    from .economic_outline_generation import _compute_totals

    outline["totals"] = _compute_totals(line_items, importo_base=importo_base)
    relation.outline = outline
    relation.line_items = line_items
    relation.save(update_fields=["outline", "line_items", "updated_at"])


def auto_generate_offers_for_tender(tender: Tender, *, force: bool = False) -> dict[str, bool]:
    """Genera outline e bozze offerta tecnica/economica dai documenti elaborati."""
    results = {"technical": False, "economic": False}

    tech_relation = get_or_create_technical_relation(tender)
    if force or not tech_relation.generated_at or not tech_relation.sections:
        outline = generate_technical_relation_outline(tender)
        apply_outline_to_relation(
            tech_relation,
            outline,
            preserve_section_content=not force,
        )
        auto_fill_technical_content(tech_relation, tender)
        tech_relation.auto_generated = True
        tech_relation.save(update_fields=["auto_generated", "updated_at"])
        results["technical"] = True

    econ_relation = get_or_create_economic_relation(tender)
    if force or not econ_relation.generated_at or not econ_relation.line_items:
        outline, line_items = generate_economic_relation_outline(tender)
        apply_outline_to_economic_relation(
            econ_relation,
            outline,
            line_items,
            preserve_line_items=not force,
        )
        auto_fill_economic_content(econ_relation, tender)
        econ_relation.auto_generated = True
        econ_relation.save(update_fields=["auto_generated", "updated_at"])
        results["economic"] = True

    return results
