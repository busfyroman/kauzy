"""Shared HTTP and data utilities for all scrapers."""
from __future__ import annotations

import json
import time
import logging
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import (
    HEADERS,
    MAX_RETRIES,
    RETRY_BACKOFF_FACTOR,
    REQUEST_TIMEOUT,
    RATE_LIMIT_DELAY,
    OUTPUT_DIR,
    FRONTEND_DATA_DIR,
    SIZE_GUARD_THRESHOLD,
)

logger = logging.getLogger(__name__)

_last_request_time: dict[str, float] = {}


def get_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    retry = Retry(
        total=MAX_RETRIES,
        backoff_factor=RETRY_BACKOFF_FACTOR,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def rate_limited_get(
    session: requests.Session,
    url: str,
    domain: str | None = None,
    **kwargs: Any,
) -> requests.Response:
    """GET with per-domain rate limiting."""
    if domain is None:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc

    now = time.time()
    last = _last_request_time.get(domain, 0)
    wait = RATE_LIMIT_DELAY - (now - last)
    if wait > 0:
        time.sleep(wait)

    kwargs.setdefault("timeout", REQUEST_TIMEOUT)
    response = session.get(url, **kwargs)
    _last_request_time[domain] = time.time()
    response.raise_for_status()
    return response


def write_json(filename: str, data: Any) -> Path:
    """Write JSON to output directory with sorted keys for deterministic diffs."""
    path = OUTPUT_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
    logger.info("Wrote %s (%d bytes)", path.name, path.stat().st_size)
    return path


def read_json(filename: str) -> Any:
    """Read JSON from output directory, returns None if not found."""
    path = OUTPUT_DIR / filename
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def copy_output_to_frontend() -> None:
    """Copy all output files to frontend/public/data/."""
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)

    for src in OUTPUT_DIR.iterdir():
        if src.is_dir():
            dst = FRONTEND_DATA_DIR / src.name
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, FRONTEND_DATA_DIR / src.name)

    logger.info("Copied output to %s", FRONTEND_DATA_DIR)


def check_size_guard(filename: str, new_data: list | dict) -> bool:
    """Return True if safe to write, False if size guard triggered."""
    old = read_json(filename)
    if old is None:
        return True

    old_len = len(old) if isinstance(old, list) else len(json.dumps(old))
    new_len = len(new_data) if isinstance(new_data, list) else len(json.dumps(new_data))

    if old_len == 0:
        return True

    ratio = new_len / old_len
    if ratio < SIZE_GUARD_THRESHOLD:
        logger.error(
            "Size guard triggered for %s: old=%d, new=%d (ratio=%.2f < %.2f). "
            "Keeping previous data.",
            filename, old_len, new_len, ratio, SIZE_GUARD_THRESHOLD,
        )
        return False
    return True


def slugify(text: str) -> str:
    """Create URL-safe slug from text."""
    from unidecode import unidecode
    import re
    text = unidecode(text).lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")
