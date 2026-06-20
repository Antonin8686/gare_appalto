from __future__ import annotations

import logging
import os
from urllib.parse import urlparse

from django.db.models import QuerySet

from ..models import Document, Tender
from .document_link_extraction import (
    dedupe_preserve_order,
    extract_urls_from_html,
    extract_urls_from_text,
    filter_document_urls,
)
from .document_processing import process_uploaded_document

logger = logging.getLogger(__name__)

MAX_DOWNLOADS_PER_RUN = 15


def _guess_doc_type(filename: str, url: str) -> str:
    from .document_types import infer_doc_type

    return infer_doc_type(filename, url=url)


def _filename_from_url(url: str, content_type: str | None) -> str:
    import mimetypes
    from urllib.parse import unquote

    path = unquote(urlparse(url).path)
    name = os.path.basename(path)
    if name and "." in name:
        return name[:255]
    ext = mimetypes.guess_extension(content_type or "") or ".pdf"
    return f"documento{ext}"[:255]


def _is_allowed_extension(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in Document.ALLOWED_EXTENSIONS


def _existing_download_keys(documents: QuerySet[Document]) -> set[str]:
    keys: set[str] = set()
    for document in documents:
        keys.add(document.original_filename.lower())
        keys.add(document.name.lower())
        keys.add(os.path.splitext(document.original_filename)[0].lower())
    return keys


def _url_download_key(url: str) -> str:
    path = urlparse(url).path
    basename = os.path.basename(path).lower()
    if basename:
        return basename
    return urlparse(url).netloc.lower()


def download_tender_document(tender: Tender, url: str | None = None) -> Document | None:
    """Scarica un documento da URL e lo associa alla gara."""
    import mimetypes
    import uuid

    import requests
    from django.core.files.base import ContentFile

    target_url = (url or tender.document_url or "").strip()
    if not target_url:
        return None
    if not target_url.startswith(("http://", "https://")):
        return None

    try:
        response = requests.get(
            target_url,
            timeout=60,
            headers={"User-Agent": "GareAppaltoBot/1.0"},
            allow_redirects=True,
        )
        response.raise_for_status()
    except requests.RequestException:
        logger.info("Download fallito per gara %s: %s", tender.id, target_url)
        return None

    content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
    final_url = response.url or target_url

    if content_type.startswith("text/html") or "<html" in response.text[:500].lower():
        discovered = filter_document_urls(extract_urls_from_html(response.text, final_url))
        if not discovered:
            return None
        for nested_url in discovered:
            document = download_tender_document(tender, nested_url)
            if document:
                return document
        return None

    filename = _filename_from_url(final_url, content_type)
    if not _is_allowed_extension(filename):
        guessed = mimetypes.guess_extension(content_type or "")
        if guessed and guessed in Document.ALLOWED_EXTENSIONS:
            filename = f"{os.path.splitext(filename)[0]}{guessed}"[:255]
        else:
            filename = f"documento_{uuid.uuid4().hex[:8]}.pdf"

    doc_type = _guess_doc_type(filename, final_url)
    name = os.path.splitext(filename)[0][:255]

    document = Document(
        tender=tender,
        name=name,
        doc_type=doc_type,
        source=Document.Source.DOWNLOAD,
        original_filename=filename,
        content_type=content_type or "application/octet-stream",
        file_size=len(response.content),
        status=Document.Status.PROCESSING,
    )
    document.file.save(filename, ContentFile(response.content), save=False)
    document.save()
    return document


def collect_download_urls(tender: Tender, *, extra_text: str = "") -> list[str]:
    urls: list[str] = []
    if tender.document_url:
        urls.append(tender.document_url.strip())

    for document in tender.documents.filter(status=Document.Status.DONE).exclude(text_content=""):
        if document.doc_type in {
            Document.DocType.DISCIPLINARE,
            Document.DocType.CAPITOLATO,
        }:
            urls.extend(extract_urls_from_text(document.text_content))

    if extra_text.strip():
        urls.extend(extract_urls_from_text(extra_text))

    return filter_document_urls(dedupe_preserve_order(urls))


def download_discovered_documents(
    tender: Tender,
    *,
    extra_text: str = "",
    max_downloads: int = MAX_DOWNLOADS_PER_RUN,
) -> list[Document]:
    """Scarica documenti da URL noti (Telemat + link nel disciplinare)."""
    documents = tender.documents.all()
    existing_keys = _existing_download_keys(documents)
    downloaded: list[Document] = []

    for url in collect_download_urls(tender, extra_text=extra_text):
        if len(downloaded) >= max_downloads:
            break
        key = _url_download_key(url)
        if key in existing_keys:
            continue
        document = download_tender_document(tender, url)
        if not document:
            continue
        existing_keys.add(key)
        existing_keys.add(document.original_filename.lower())
        process_uploaded_document(document)
        downloaded.append(document)

    return downloaded
