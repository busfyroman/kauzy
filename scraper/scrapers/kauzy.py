"""Scraper for kauzy.sk - political scandals and actors."""
from __future__ import annotations

import logging
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from config import KAUZY_BASE_URL
from utils import get_session, rate_limited_get, slugify

logger = logging.getLogger(__name__)

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
}


def _get_kauzy_from_api(session) -> list[dict]:
    """Get all kauza taxonomy terms from WP REST API."""
    terms = []
    page = 1
    per_page = 100

    while True:
        try:
            url = f"{KAUZY_BASE_URL}/wp-json/wp/v2/kauza"
            resp = rate_limited_get(
                session, url, domain="kauzy.sk",
                params={"per_page": per_page, "page": page},
                headers={**BROWSER_HEADERS, "Accept": "application/json"},
            )
            if resp.status_code != 200:
                break

            batch = resp.json()
            if not batch:
                break

            for term in batch:
                terms.append({
                    "id": slugify(term.get("name", "")),
                    "wp_id": term.get("id"),
                    "title": term.get("name", ""),
                    "slug": term.get("slug", ""),
                    "url": term.get("link", ""),
                    "count": term.get("count", 0),
                })

            if len(batch) < per_page:
                break
            page += 1

        except Exception as e:
            logger.error("Failed to fetch kauzy from API page %d: %s", page, e)
            break

    logger.info("Got %d kauzy from WP REST API", len(terms))
    return terms


def _parse_kauza_detail(session, kauza: dict) -> dict:
    """Visit kauza detail page and extract description + actors."""
    url = kauza.get("url") or f"{KAUZY_BASE_URL}/kauza/{kauza['slug']}/"
    kauza["description"] = ""
    kauza["actors"] = []

    try:
        resp = rate_limited_get(
            session, url, domain="kauzy.sk",
            headers=BROWSER_HEADERS,
        )
        if resp.status_code != 200:
            logger.warning("Kauza page returned %d: %s", resp.status_code, url)
            return kauza

        soup = BeautifulSoup(resp.text, "lxml")

        desc_div = soup.find("div", class_="text")
        if desc_div:
            paragraphs = desc_div.find_all("p")
            kauza["description"] = "\n".join(
                p.get_text(strip=True) for p in paragraphs[:3] if p.get_text(strip=True)
            )

        if not kauza["description"]:
            for p in soup.find_all("p"):
                text = p.get_text(strip=True)
                if len(text) > 50 and "cookie" not in text.lower():
                    kauza["description"] = text[:500]
                    break

        seen_actors = set()
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if "/akter/" not in href:
                continue

            actor_slug = href.rstrip("/").split("/")[-1]
            if actor_slug in seen_actors:
                continue
            seen_actors.add(actor_slug)

            item_div = a_tag.find_parent("div", class_="item") or a_tag
            name_el = item_div.find("div", class_="content") if item_div else None

            actor_name = ""
            actor_role = ""
            actor_status = ""

            if name_el:
                status_divs = name_el.find_all("div", class_="status")
                for sd in status_divs:
                    st = sd.get_text(strip=True)
                    if st:
                        actor_status = st

                children = list(name_el.children)
                text_parts = []
                for child in children:
                    if hasattr(child, "name") and child.name == "div" and "status" in (child.get("class") or []):
                        continue
                    txt = child.get_text(strip=True) if hasattr(child, "get_text") else str(child).strip()
                    if txt and txt != actor_status:
                        text_parts.append(txt)

                if not text_parts:
                    full_text = name_el.get_text(separator="\n", strip=True)
                    full_text = full_text.replace(actor_status, "").strip()
                    text_parts = [p.strip() for p in full_text.split("\n") if p.strip()]

                if len(text_parts) >= 2:
                    actor_name = text_parts[0]
                    actor_role = text_parts[1]
                elif len(text_parts) == 1:
                    actor_name = text_parts[0]
            else:
                actor_name = a_tag.get_text(strip=True)

            if not actor_name or len(actor_name) < 3:
                continue

            actor_name = re.sub(
                r"(obvinenie|odsúdenie|obžaloba|zrušené|právoplatné|neprávoplatné|zastavenie|oslobodenie|stíhanie)",
                "", actor_name, flags=re.IGNORECASE,
            ).strip()

            if not actor_name:
                continue

            kauza["actors"].append({
                "name": actor_name,
                "slug": actor_slug,
                "url": urljoin(KAUZY_BASE_URL, href),
                "role": actor_role,
                "status": actor_status,
            })

    except Exception as e:
        logger.warning("Failed to parse kauza detail %s: %s", url, e)

    return kauza


def scrape_kauzy() -> list[dict]:
    """Scrape all cases and actors from kauzy.sk."""
    session = get_session()

    kauzy = _get_kauzy_from_api(session)

    all_actors = {}
    for kauza in kauzy:
        _parse_kauza_detail(session, kauza)
        logger.info(
            "Scraped kauza: %s (%d actors)",
            kauza["title"], len(kauza.get("actors", [])),
        )

        for actor in kauza.get("actors", []):
            slug = actor["slug"]
            if slug not in all_actors:
                all_actors[slug] = {
                    "id": slug,
                    "name": actor["name"],
                    "url": actor["url"],
                    "role": actor.get("role", ""),
                    "kauzy": [],
                }
            all_actors[slug]["kauzy"].append({
                "title": kauza["title"],
                "slug": kauza["slug"],
                "status": actor.get("status", ""),
            })

    result = {
        "kauzy": kauzy,
        "actors": list(all_actors.values()),
    }

    logger.info(
        "Total kauzy: %d, unique actors: %d",
        len(kauzy), len(all_actors),
    )
    return result
