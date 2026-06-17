from ..models import TechnicalRelation, TechnicalRelationVersion


def _next_version_number(relation: TechnicalRelation) -> int:
    latest = (
        TechnicalRelationVersion.objects.filter(relation=relation)
        .order_by("-version")
        .values_list("version", flat=True)
        .first()
    )
    return (latest or 0) + 1


def snapshot_technical_relation(
    relation: TechnicalRelation,
    *,
    created_by,
    change_note: str = "",
) -> TechnicalRelationVersion:
    return TechnicalRelationVersion.objects.create(
        relation=relation,
        version=_next_version_number(relation),
        company=relation.company,
        outline=relation.outline,
        sections=relation.sections,
        created_by=created_by,
        change_note=change_note,
    )


def restore_technical_relation_version(
    relation: TechnicalRelation,
    version_number: int,
    *,
    created_by,
) -> TechnicalRelation:
    version = TechnicalRelationVersion.objects.get(
        relation=relation,
        version=version_number,
    )
    relation.company = version.company
    relation.outline = version.outline
    relation.sections = version.sections
    relation.save(update_fields=["company", "outline", "sections", "updated_at"])
    snapshot_technical_relation(
        relation,
        created_by=created_by,
        change_note=f"Ripristino versione {version_number}",
    )
    return relation
