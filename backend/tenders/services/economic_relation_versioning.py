from ..models import EconomicRelation, EconomicRelationVersion


def _next_version_number(relation: EconomicRelation) -> int:
    latest = (
        EconomicRelationVersion.objects.filter(relation=relation)
        .order_by("-version")
        .values_list("version", flat=True)
        .first()
    )
    return (latest or 0) + 1


def snapshot_economic_relation(
    relation: EconomicRelation,
    *,
    created_by=None,
    change_note: str = "",
) -> EconomicRelationVersion:
    return EconomicRelationVersion.objects.create(
        relation=relation,
        version=_next_version_number(relation),
        company=relation.company,
        outline=relation.outline,
        line_items=relation.line_items,
        created_by=created_by,
        change_note=change_note[:255],
    )


def restore_economic_relation_version(
    relation: EconomicRelation,
    version: int,
    *,
    created_by=None,
) -> EconomicRelation:
    record = EconomicRelationVersion.objects.get(relation=relation, version=version)
    snapshot_economic_relation(
        relation,
        created_by=created_by,
        change_note=f"Snapshot prima del ripristino v{version}",
    )
    relation.company = record.company
    relation.outline = record.outline
    relation.line_items = record.line_items
    relation.save(update_fields=["company", "outline", "line_items", "updated_at"])
    return relation
