"""Scraper for company data from ORSR + RPVS API."""
from __future__ import annotations

import logging
import re
from urllib.parse import quote

from bs4 import BeautifulSoup

from config import ORSR_BASE_URL, RPVS_API_URL
from utils import get_session, rate_limited_get, read_json, write_json
from validators.identity import (
    normalize_name,
    name_to_ascii,
    exact_name_match,
    compute_confidence,
    get_confidence_signals,
    split_name,
)

logger = logging.getLogger(__name__)


def _search_orsr(session, name: str) -> list[dict]:
    """Search ORSR by person name, return list of company records."""
    first, last = split_name(name)
    results = []
    first_norm = name_to_ascii(first)

    page = 1
    max_pages = 5

    while page <= max_pages:
        try:
            search_url = (
                f"{ORSR_BASE_URL}/hladaj_osoba.asp"
                f"?PR={quote(last)}&MENO={quote(first)}&SID=0&T=f&STR={page}"
            )
            resp = rate_limited_get(session, search_url, domain="www.orsr.sk")
            soup = BeautifulSoup(resp.text, "lxml")

            rows = soup.find_all("tr")
            found_any = False

            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 4:
                    continue

                num_text = cells[0].get_text(strip=True)
                if not num_text or not num_text.rstrip(".").isdigit():
                    continue

                person_name_raw = cells[1].get_text(strip=True)
                company_cell = cells[2]
                company_link = company_cell.find("a", href=True)
                if not company_link:
                    continue

                company_name = company_link.get_text(strip=True)
                detail_href = company_link.get("href", "")

                person_norm = name_to_ascii(person_name_raw)
                if first_norm and first_norm not in person_norm:
                    continue

                orsr_id = ""
                id_match = re.search(r"ID=(\d+)", detail_href)
                if id_match:
                    orsr_id = id_match.group(1)

                if company_name and len(company_name) > 2:
                    found_any = True
                    results.append({
                        "companyName": company_name,
                        "ico": "",
                        "orsr_id": orsr_id,
                        "personName": person_name_raw.strip(),
                        "role": "",
                        "source": "orsr",
                        "detailUrl": f"{ORSR_BASE_URL}/{detail_href}" if detail_href else "",
                    })

            next_link = soup.find("a", string=">>>")
            if not next_link or not found_any:
                break
            page += 1

        except Exception as e:
            logger.warning("ORSR search failed for %s (page %d): %s", name, page, e)
            break

    return results


def _get_ico_from_detail(session, detail_url: str) -> str:
    """Fetch IČO from an ORSR company detail page."""
    try:
        resp = rate_limited_get(session, detail_url, domain="www.orsr.sk")
        text = resp.content.decode("windows-1250", errors="replace")
        ico_match = re.search(
            r"IČO.*?<span[^>]*>\s*([\d\s]{6,12})\s*</span>",
            text, re.DOTALL | re.IGNORECASE,
        )
        if ico_match:
            return ico_match.group(1).replace(" ", "").strip()
        ico_match2 = re.search(r"IČO[:\s&nbsp;]*(\d[\d\s]{5,11})", text, re.IGNORECASE)
        if ico_match2:
            return ico_match2.group(1).replace(" ", "").strip()
    except Exception as e:
        logger.debug("Could not fetch ICO from %s: %s", detail_url, e)
    return ""


def _make_company_key(company: dict) -> str:
    """Create a unique key for a company record."""
    if company.get("ico"):
        return f"ico:{company['ico']}"
    if company.get("orsr_id"):
        return f"orsr:{company['orsr_id']}"
    return f"name:{company['companyName'].lower().strip()}"


MAX_COMPANIES_PER_PERSON = 15
LOW_CONFIDENCE_THRESHOLD = 10


def scrape_companies() -> list[dict]:
    """Find companies linked to all politicians and their spouses."""
    politicians = read_json("politicians.json")
    if not politicians:
        logger.warning("No politicians.json found")
        return []

    session = get_session()
    all_companies = {}

    for politician in politicians:
        name = politician["name"]
        logger.info("Searching companies for: %s", name)

        orsr_results = _search_orsr(session, name)

        total_for_person = len(orsr_results)
        if total_for_person > MAX_COMPANIES_PER_PERSON:
            logger.warning(
                "Name '%s' returned %d ORSR results (likely common name), capping at %d",
                name, total_for_person, MAX_COMPANIES_PER_PERSON,
            )
            orsr_results = orsr_results[:MAX_COMPANIES_PER_PERSON]

        confidence = "low" if total_for_person >= LOW_CONFIDENCE_THRESHOLD else "medium"

        for company in orsr_results:
            key = _make_company_key(company)
            if key not in all_companies:
                all_companies[key] = {
                    "ico": company.get("ico", ""),
                    "orsr_id": company.get("orsr_id", ""),
                    "name": company["companyName"],
                    "linkedPoliticians": [],
                    "linkedSpouses": [],
                    "source": company["source"],
                    "role": company.get("role", ""),
                    "detailUrl": company.get("detailUrl", ""),
                }

            entry = {
                "politicianId": politician["id"],
                "politicianName": politician["name"],
                "confidence": confidence,
                "signals": ["name_match"],
            }
            existing_ids = [
                p["politicianId"]
                for p in all_companies[key]["linkedPoliticians"]
            ]
            if politician["id"] not in existing_ids:
                all_companies[key]["linkedPoliticians"].append(entry)

            if key not in politician["companies"]:
                politician["companies"].append(key)

        spouse = politician.get("spouse")
        if spouse and spouse.get("name"):
            spouse_name = spouse["name"]
            logger.info("Searching companies for spouse: %s", spouse_name)

            spouse_orsr = _search_orsr(session, spouse_name)

            for company in spouse_orsr:
                key = _make_company_key(company)
                if key not in all_companies:
                    all_companies[key] = {
                        "ico": company.get("ico", ""),
                        "orsr_id": company.get("orsr_id", ""),
                        "name": company["companyName"],
                        "linkedPoliticians": [],
                        "linkedSpouses": [],
                        "source": company["source"],
                        "role": company.get("role", ""),
                        "detailUrl": company.get("detailUrl", ""),
                    }

                conf = compute_confidence(name_match_exact=True)
                signals = get_confidence_signals(name_match_exact=True)

                spouse_entry = {
                    "politicianId": politician["id"],
                    "spouseName": spouse_name,
                    "confidence": conf,
                    "signals": signals,
                }
                all_companies[key]["linkedSpouses"].append(spouse_entry)

                politician["spouseCompanies"].append({
                    "ico": company.get("ico", ""),
                    "companyName": company["companyName"],
                    "confidence": conf,
                    "signals": signals,
                })

    logger.info("Fetching ICOs for %d companies from ORSR detail pages...", len(all_companies))
    for key, company in all_companies.items():
        if not company["ico"] and company.get("detailUrl"):
            ico = _get_ico_from_detail(session, company["detailUrl"])
            if ico:
                company["ico"] = ico

    write_json("politicians.json", politicians)
    companies_list = list(all_companies.values())
    logger.info("Total unique companies found: %d", len(companies_list))
    return companies_list
