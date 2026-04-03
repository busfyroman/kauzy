"""Scraper for nrsr.sk - Slovak National Council (parliament) members."""
from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, parse_qs, urlparse

from bs4 import BeautifulSoup

from config import NRSR_BASE_URL, NRSR_MEMBERS_URL, PHOTOS_DIR
from utils import get_session, rate_limited_get, slugify

logger = logging.getLogger(__name__)


def _download_photo(session, url: str, politician_id: str) -> str | None:
    if not url:
        return None
    try:
        resp = rate_limited_get(session, url, domain="www.nrsr.sk")
        ext = ".jpg"
        photo_path = PHOTOS_DIR / f"{politician_id}{ext}"
        with open(photo_path, "wb") as f:
            f.write(resp.content)
        return f"/data/photos/{politician_id}{ext}"
    except Exception as e:
        logger.warning("Failed to download photo for %s: %s", politician_id, e)
        return None


def _parse_member_detail(session, url: str) -> dict:
    """Parse an MP's detail page on nrsr.sk."""
    info = {}
    try:
        resp = rate_limited_get(session, url, domain="www.nrsr.sk")
        soup = BeautifulSoup(resp.text, "lxml")

        img = soup.find("img", src=re.compile(r"(photo|foto|image|poslan)", re.I))
        if img and img.get("src"):
            info["photo_url"] = urljoin(url, img["src"])

        for strong in soup.find_all("strong"):
            txt = strong.get_text(strip=True)

            if "Kandidoval" in txt and "za" in txt:
                nxt = strong.next_sibling
                while nxt:
                    st = nxt.get_text(strip=True) if hasattr(nxt, "get_text") else str(nxt).strip()
                    if st:
                        info["party"] = st
                        break
                    nxt = nxt.next_sibling

            if "Narodený" in txt:
                nxt = strong.next_sibling
                while nxt:
                    st = nxt.get_text(strip=True) if hasattr(nxt, "get_text") else str(nxt).strip()
                    if st:
                        match = re.match(r"(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})", st)
                        if match:
                            d, m, y = match.groups()
                            info["birthDate"] = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
                        break
                    nxt = nxt.next_sibling

            if "Člen poslaneckého klubu" in txt or "Poslanecký klub" in txt:
                nxt = strong.next_sibling
                while nxt:
                    st = nxt.get_text(strip=True) if hasattr(nxt, "get_text") else str(nxt).strip()
                    if st:
                        info["club"] = st
                        break
                    nxt = nxt.next_sibling

        text = soup.get_text()
        email_match = re.search(r"(?:E-mail|Email)[:\s]*([\w.+-]+@[\w-]+\.[\w.-]+)", text, re.I)
        if email_match:
            info["email"] = email_match.group(1).strip()
        region_match = re.search(r"(?:Kraj|Obvod)[:\s]*(.+?)(?:\n|$)", text, re.I)
        if region_match:
            info["region"] = region_match.group(1).strip()

    except Exception as e:
        logger.warning("Failed to parse MP detail %s: %s", url, e)

    return info


def scrape_nrsr() -> list[dict]:
    """Scrape all current MPs from nrsr.sk."""
    session = get_session()
    members = []

    try:
        resp = rate_limited_get(session, NRSR_MEMBERS_URL, domain="www.nrsr.sk")
        soup = BeautifulSoup(resp.text, "lxml")

        mp_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "PoslanecID" in href:
                full_url = urljoin(NRSR_BASE_URL + "/", href)
                name = a.get_text(strip=True)
                if not name or len(name) < 3:
                    continue
                if "," not in name:
                    continue
                if full_url not in [l[1] for l in mp_links]:
                    mp_links.append((name, full_url))

        logger.info("Found %d MP links on list page", len(mp_links))

        for name, url in mp_links:
            politician_id = slugify(name)
            detail = _parse_member_detail(session, url)

            photo = None
            if detail.get("photo_url"):
                photo = _download_photo(session, detail["photo_url"], politician_id)

            birth_date = detail.get("birthDate", "")

            member = {
                "id": politician_id,
                "name": name,
                "titles": "",
                "photo": photo,
                "birthDate": birth_date,
                "position": "Poslanec/Poslankyňa NR SR",
                "institution": "nrsr",
                "party": detail.get("party", ""),
                "club": detail.get("club", ""),
                "region": detail.get("region", ""),
                "email": detail.get("email", ""),
                "education": [],
                "career": [],
                "companies": [],
                "spouse": None,
                "spouseCompanies": [],
                "kauzy": [],
                "procurement": [],
                "detailUrl": url,
            }
            members.append(member)
            logger.info("Scraped MP: %s", name)

    except Exception as e:
        logger.error("Failed to scrape NRSR: %s", e, exc_info=True)

    logger.info("Total MPs scraped: %d", len(members))
    return members
