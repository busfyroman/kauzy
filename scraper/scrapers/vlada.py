"""Scraper for vlada.gov.sk - Slovak government members."""
from __future__ import annotations

import logging
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from config import (
    VLADA_BASE_URL,
    VLADA_MEMBERS_URL,
    PHOTOS_DIR,
)
from utils import get_session, rate_limited_get, slugify

logger = logging.getLogger(__name__)


def _download_photo(session, url: str, politician_id: str) -> str | None:
    if not url:
        return None
    try:
        resp = rate_limited_get(session, url, domain="www.vlada.gov.sk")
        ext = ".jpg"
        if ".png" in url.lower():
            ext = ".png"
        photo_path = PHOTOS_DIR / f"{politician_id}{ext}"
        with open(photo_path, "wb") as f:
            f.write(resp.content)
        return f"/data/photos/{politician_id}{ext}"
    except Exception as e:
        logger.warning("Failed to download photo %s: %s", url, e)
        return None


def _parse_member_detail(session, url: str) -> dict:
    """Parse individual government member detail page for bio data."""
    info = {}
    try:
        resp = rate_limited_get(session, url, domain="www.vlada.gov.sk")
        soup = BeautifulSoup(resp.text, "lxml")

        img = soup.find("img", src=re.compile(r"\.(jpg|jpeg|png)", re.I))
        if img and img.get("src"):
            info["photo_url"] = urljoin(url, img["src"])

        text_content = soup.get_text()

        birth_match = re.search(
            r"(?:Dátum narodenia|Narodený|Narodená)[:\s]*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})",
            text_content,
        )
        if birth_match:
            d, m, y = birth_match.groups()
            info["birthDate"] = f"{y}-{m.zfill(2)}-{d.zfill(2)}"

        content = soup.find("div", {"id": "main-content"}) or soup.find("main") or soup
        education = []
        career = []
        current_section = None
        for el in content.find_all(["h2", "h3", "h4", "p", "li"]):
            text = el.get_text(strip=True).lower()
            if "vzdelan" in text:
                current_section = "education"
            elif "kariér" in text or "profesi" in text or "prax" in text:
                current_section = "career"
            elif el.name in ("li", "p") and current_section:
                val = el.get_text(strip=True)
                if val and len(val) > 3:
                    if current_section == "education":
                        education.append(val)
                    elif current_section == "career":
                        career.append(val)

        if education:
            info["education"] = education
        if career:
            info["career"] = career

    except Exception as e:
        logger.warning("Failed to parse detail page %s: %s", url, e)

    return info


def _split_name_position(text: str) -> tuple[str, str]:
    """Split a combined 'NamePosition' string into name and position.
    
    E.g. 'Robert FicoPredseda vlády SR' -> ('Robert Fico', 'Predseda vlády SR')
    The boundary is where a lowercase letter is followed by an uppercase letter
    that starts a known position keyword.
    """
    position_keywords = [
        "Predsed", "Podpredsed", "Minister", "Ministerstvo",
        "poverený", "Poverený", "Splnomocnen", "minister",
    ]
    for kw in position_keywords:
        idx = text.find(kw)
        if idx > 0:
            return text[:idx].strip(), text[idx:].strip()

    match = re.search(r"([a-záéíóúýčďĺľňŕšťžäô])([A-ZÁÉÍÓÚÝČĎĹĽŇŔŠŤŽ])", text)
    if match:
        split_pos = match.start() + 1
        return text[:split_pos].strip(), text[split_pos:].strip()

    return text.strip(), ""


def scrape_vlada() -> list[dict]:
    """Scrape all government members from vlada.gov.sk/vlada-sr/clenovia-vlady/."""
    session = get_session()
    members = []

    try:
        resp = rate_limited_get(session, VLADA_MEMBERS_URL, domain="www.vlada.gov.sk")
        soup = BeautifulSoup(resp.text, "lxml")

        content = (
            soup.find("div", class_="govuk-grid-column-full")
            or soup.find("div", {"id": "main-content"})
            or soup.find("main")
            or soup
        )

        paragraphs = content.find_all("p", class_="govuk-body")
        if not paragraphs:
            paragraphs = soup.find_all("p", class_="govuk-body")
        logger.info("Found %d govuk-body paragraphs", len(paragraphs))

        for p_tag in paragraphs:
            text = p_tag.get_text(strip=True)
            if not text or len(text) < 10:
                continue

            skip_prefixes = [
                "Aktualizované", "Programové", "História",
                "Archív", "Kontakt",
            ]
            if any(text.startswith(sp) for sp in skip_prefixes):
                continue

            link = p_tag.find("a", href=True)
            ministry_url = ""
            ministry_name = ""
            if link:
                ministry_url = link.get("href", "")
                ministry_name = link.get_text(strip=True)

            name_and_position = text
            if ministry_name:
                name_and_position = text.replace(ministry_name, "").strip()

            name, position = _split_name_position(name_and_position)

            if not name or len(name) < 3:
                continue

            # Skip if it looks like a non-person entry
            if any(skip in name.lower() for skip in ["programové", "aktualizované", "pdf"]):
                continue

            politician_id = slugify(name)

            detail_url = ""
            if "predseda-vlady" in text.lower() or "predseda vlády" in position.lower():
                detail_url = f"{VLADA_BASE_URL}/vlada-sr/predseda-vlady/"

            detail = {}
            if detail_url:
                detail = _parse_member_detail(session, detail_url)

            photo = None
            if detail.get("photo_url"):
                photo = _download_photo(session, detail["photo_url"], politician_id)

            member = {
                "id": politician_id,
                "name": name,
                "titles": "",
                "photo": photo,
                "birthDate": detail.get("birthDate", ""),
                "position": position or "Člen vlády",
                "institution": "vlada",
                "party": "",
                "education": detail.get("education", []),
                "career": detail.get("career", []),
                "companies": [],
                "spouse": None,
                "spouseCompanies": [],
                "kauzy": [],
                "procurement": [],
                "detailUrl": detail_url or ministry_url,
                "ministry": ministry_name,
                "ministryUrl": ministry_url,
            }
            members.append(member)
            logger.info("Scraped government member: %s - %s", name, position)

    except Exception as e:
        logger.error("Failed to scrape vlada.gov.sk: %s", e, exc_info=True)

    logger.info("Total government members scraped: %d", len(members))
    return members
