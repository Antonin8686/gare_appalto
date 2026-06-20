"""Estrazione link a documenti di gara da testo e pagine HTML."""

from __future__ import annotations

import re
from html import unescape
from urllib.parse import urljoin, urlparse

from ..models import Document

URL_PATTERN = re.compile(r"https?://[^\s\]<>'\"]+", re.IGNORECASE)
HTML_HREF_PATTERN = re.compile(
    r"""href\s*=\s*["']([^"']+)["']""",
    re.IGNORECASE,
)
DOWNLOADABLE_EXTENSIONS = Document.ALLOWED_EXTENSIONS
PORTAL_HOST_HINTS = (
    "acquistinretepa",
    "sintel",
    "mepa",
    "telemat",
    "appalti",
    "gare",
    "pubblica-amministrazione",
    "consip",
    "anac",
    "intercent-er",
    "regione.",
    "comune.",
)

SKIP_URL_FRAGMENTS = (
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "youtube.com",
    "google.com/maps",
    "mailto:",
    "javascript:",
)


def _normalize_url(url: str) -> str:
    cleaned = unescape(url.strip().rstrip(".,;:)"))
    return cleaned


def _is_download_candidate(url: str) -> bool:
    lowered = url.lower()
    if any(fragment in lowered for fragment in SKIP_URL_FRAGMENTS):
        return False
    path = urlparse(lowered).path
    ext = "." + path.rsplit(".", 1)[-1] if "." in path else ""
    if ext in DOWNLOADABLE_EXTENSIONS:
        return True
    if any(host in lowered for host in PORTAL_HOST_HINTS):
        return True
    if re.search(r"/(?:gara|gare|documenti|documentazione|download|bandi)/", lowered):
        return True
    return False


def extract_urls_from_text(text: str) -> list[str]:
    if not text.strip():
        return []
    seen: set[str] = set()
    ordered: list[str] = []
    for match in URL_PATTERN.finditer(text):
        url = _normalize_url(match.group(0))
        if not url.startswith(("http://", "https://")):
            continue
        if url in seen:
            continue
        seen.add(url)
        ordered.append(url)
    return ordered


def extract_urls_from_html(html: str, base_url: str) -> list[str]:
    if not html.strip():
        return []
    seen: set[str] = set()
    ordered: list[str] = []
    for match in HTML_HREF_PATTERN.finditer(html):
        href = _normalize_url(match.group(1))
        if not href or href.startswith("#"):
            continue
        absolute = urljoin(base_url, href)
        if absolute in seen:
            continue
        seen.add(absolute)
        ordered.append(absolute)
    return ordered


def filter_document_urls(urls: list[str]) -> list[str]:
    return [url for url in urls if _is_download_candidate(url)]


def dedupe_preserve_order(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for url in urls:
        normalized = _normalize_url(url)
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result
