from __future__ import annotations

import mimetypes
import os
import re
import uuid
from urllib.parse import unquote, urlparse

import requests
from django.core.files.base import ContentFile

from ..models import Document, Tender


def _guess_doc_type(filename: str, url: str) -> str:
    from .document_types import infer_doc_type

    return infer_doc_type(filename, url=url)


def _filename_from_url(url: str, content_type: str | None) -> str:
    path = unquote(urlparse(url).path)
    name = os.path.basename(path)
    if name and "." in name:
        return name[:255]
    ext = mimetypes.guess_extension(content_type or "") or ".pdf"
    return f"documento{ext}"[:255]


def _is_allowed_extension(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in Document.ALLOWED_EXTENSIONS


def download_tender_document(tender: Tender, url: str | None = None) -> Document | None:
    """Scarica un documento da URL e lo associa alla gara."""
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
        return None

    content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
    filename = _filename_from_url(response.url, content_type)
    if not _is_allowed_extension(filename):
        guessed = mimetypes.guess_extension(content_type or "")
        if guessed and guessed in Document.ALLOWED_EXTENSIONS:
            filename = f"{os.path.splitext(filename)[0]}{guessed}"[:255]
        else:
            filename = f"documento_{uuid.uuid4().hex[:8]}.pdf"

    doc_type = _guess_doc_type(filename, target_url)
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
