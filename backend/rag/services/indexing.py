from __future__ import annotations

from typing import Any

from django.db import transaction

from ..models import RagChunk
from .chunking import split_text_into_chunks
from .embeddings import generate_embedding


def delete_source_chunks(source_type: str, source_id: int) -> int:
    deleted, _ = RagChunk.objects.filter(source_type=source_type, source_id=source_id).delete()
    return deleted


def index_text_chunks(
    *,
    organization,
    source_type: str,
    source_id: int,
    title: str,
    text: str,
    metadata: dict[str, Any],
) -> int:
    delete_source_chunks(source_type, source_id)
    chunks = split_text_into_chunks(text)
    if not chunks:
        return 0

    objects: list[RagChunk] = []
    for chunk in chunks:
        chunk_metadata = {
            **metadata,
            "char_start": chunk.char_start,
            "char_end": chunk.char_end,
        }
        objects.append(
            RagChunk(
                organization=organization,
                source_type=source_type,
                source_id=source_id,
                chunk_index=chunk.index,
                title=title,
                text=chunk.text,
                metadata=chunk_metadata,
                embedding=generate_embedding(chunk.text),
            )
        )

    RagChunk.objects.bulk_create(objects)
    return len(objects)


def index_tender_document(document) -> int:
    from .text_builders import build_tender_document_text

    text = build_tender_document_text(document)
    if not text:
        delete_source_chunks(RagChunk.SourceType.TENDER_DOCUMENT, document.id)
        return 0

    tender = document.tender
    metadata = {
        "tender_id": tender.id,
        "tender_cig": tender.cig,
        "tender_oggetto": tender.oggetto,
        "tender_fase": tender.fase,
        "document_id": document.id,
        "document_name": document.name,
        "original_filename": document.original_filename,
        "url_path": f"/tenders/{tender.id}",
        "document_url_path": f"/tenders/{tender.id}",
    }
    return index_text_chunks(
        organization=tender.organization,
        source_type=RagChunk.SourceType.TENDER_DOCUMENT,
        source_id=document.id,
        title=document.name or document.original_filename,
        text=text,
        metadata=metadata,
    )


def index_technical_offer(offer) -> int:
    from .text_builders import build_technical_offer_text

    text = build_technical_offer_text(offer)
    if not text:
        delete_source_chunks(RagChunk.SourceType.TECHNICAL_OFFER, offer.id)
        return 0

    metadata = {
        **(offer.rag_metadata or {}),
        "url_path": f"/technical-offers/{offer.id}",
        "category": offer.category,
        "settore": offer.settore,
    }
    return index_text_chunks(
        organization=offer.organization,
        source_type=RagChunk.SourceType.TECHNICAL_OFFER,
        source_id=offer.id,
        title=offer.title,
        text=text,
        metadata=metadata,
    )


def index_requirement(requirement) -> int:
    from .text_builders import build_requirement_text

    text = build_requirement_text(requirement)
    tender = requirement.tender
    document = requirement.document
    metadata = {
        "tender_id": tender.id,
        "tender_cig": tender.cig,
        "tender_oggetto": tender.oggetto,
        "requirement_tipo": requirement.tipo,
        "requirement_categoria": requirement.categoria,
        "document_id": document.id if document else None,
        "document_name": (
            document.name if document else requirement.documento_origine or ""
        ),
        "url_path": f"/tenders/{tender.id}",
        "tender_url_path": f"/tenders/{tender.id}",
    }
    title = f"Requisito – {requirement.descrizione[:80]}"
    return index_text_chunks(
        organization=tender.organization,
        source_type=RagChunk.SourceType.REQUIREMENT,
        source_id=requirement.id,
        title=title,
        text=text,
        metadata=metadata,
    )


def index_company(company) -> int:
    from .text_builders import build_company_text

    text = build_company_text(company)
    if not text:
        delete_source_chunks(RagChunk.SourceType.COMPANY, company.id)
        return 0

    metadata = {
        "company_id": company.id,
        "company_name": company.name,
        "partita_iva": company.partita_iva,
        "url_path": f"/companies/{company.id}",
    }
    return index_text_chunks(
        organization=company.organization,
        source_type=RagChunk.SourceType.COMPANY,
        source_id=company.id,
        title=company.name,
        text=text,
        metadata=metadata,
    )


@transaction.atomic
def reindex_organization(organization, *, scope: str = "all") -> dict[str, int]:
    from companies.models import Company
    from technical_offers.models import TechnicalOffer
    from tenders.models import Document, Requirement

    counts = {
        "tender_documents": 0,
        "technical_offers": 0,
        "requirements": 0,
        "companies": 0,
        "chunks": 0,
    }

    if scope in ("all", "tender_documents"):
        documents = Document.objects.filter(
            tender__organization=organization,
            status=Document.Status.DONE,
        ).select_related("tender")
        for document in documents:
            counts["chunks"] += index_tender_document(document)
            counts["tender_documents"] += 1

    if scope in ("all", "technical_offers"):
        offers = TechnicalOffer.objects.filter(organization=organization)
        for offer in offers:
            counts["chunks"] += index_technical_offer(offer)
            counts["technical_offers"] += 1

    if scope in ("all", "requirements"):
        requirements = Requirement.objects.filter(tender__organization=organization).select_related(
            "tender", "document"
        )
        for requirement in requirements:
            counts["chunks"] += index_requirement(requirement)
            counts["requirements"] += 1

    if scope in ("all", "companies"):
        companies = Company.objects.filter(organization=organization)
        for company in companies:
            counts["chunks"] += index_company(company)
            counts["companies"] += 1

    return counts
