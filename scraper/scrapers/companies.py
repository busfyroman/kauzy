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
    names_match,
    exact_name_match,
    compute_confidence,
    get_confidence_signals,
    split_name,
)

logger = logging.getLogger(__name__)

_INACTIVE_PATTERNS = re.compile(
    r"v likvidácii|v konkurze|zrušen[áý]|vymazan[áý]|zániku",
    re.IGNORECASE,
)

_STATE_ENTITY_PATTERNS = re.compile(
    r"štátny podnik|štátny majetok|š\.\s*p\.",
    re.IGNORECASE,
)


def _decode_orsr_response(resp) -> str:
    """Decode ORSR HTTP response with correct Windows-1250 charset."""
    return resp.content.decode("windows-1250", errors="replace")


def _is_inactive_company(name: str) -> bool:
    return bool(_INACTIVE_PATTERNS.search(name))


def _is_state_entity(name: str) -> bool:
    return bool(_STATE_ENTITY_PATTERNS.search(name))


def _search_orsr(session, name: str) -> list[dict]:
    """Search ORSR by person name, return list of company records."""
    first, last = split_name(name)
    results = []
    full_norm = name_to_ascii(name)

    page = 1
    max_pages = 5

    while page <= max_pages:
        try:
            search_url = (
                f"{ORSR_BASE_URL}/hladaj_osoba.asp"
                f"?PR={quote(last)}&MENO={quote(first)}&SID=0&T=f&STR={page}"
            )
            resp = rate_limited_get(session, search_url, domain="www.orsr.sk")
            html = _decode_orsr_response(resp)
            soup = BeautifulSoup(html, "lxml")

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
                is_exact = (person_norm == full_norm)
                if not is_exact and not names_match(person_name_raw, name, threshold=85):
                    continue

                orsr_id = ""
                id_match = re.search(r"ID=(\d+)", detail_href)
                if id_match:
                    orsr_id = id_match.group(1)

                if not company_name or len(company_name) <= 2:
                    continue

                inactive = _is_inactive_company(company_name)
                state = _is_state_entity(company_name)

                if state:
                    logger.debug(
                        "Skipping state entity '%s' for %s", company_name, name,
                    )
                    continue

                found_any = True
                results.append({
                    "companyName": company_name,
                    "ico": "",
                    "orsr_id": orsr_id,
                    "personName": person_name_raw.strip(),
                    "role": "",
                    "source": "orsr",
                    "detailUrl": f"{ORSR_BASE_URL}/{detail_href}" if detail_href else "",
                    "_exactMatch": is_exact,
                    "_inactive": inactive,
                })

            next_link = soup.find("a", string=">>>")
            if not next_link or not found_any:
                break
            page += 1

        except Exception as e:
            logger.warning("ORSR search failed for %s (page %d): %s", name, page, e)
            break

    return results


def _get_detail_info(session, detail_url: str) -> dict:
    """Fetch IČO and company name from an ORSR detail page."""
    result = {"ico": "", "name": "", "person_confirmed": False}
    try:
        resp = rate_limited_get(session, detail_url, domain="www.orsr.sk")
        text = _decode_orsr_response(resp)

        ico_match = re.search(
            r"IČO.*?<span[^>]*>\s*([\d\s]{6,12})\s*</span>",
            text, re.DOTALL | re.IGNORECASE,
        )
        if ico_match:
            result["ico"] = ico_match.group(1).replace(" ", "").strip()
        else:
            ico_match2 = re.search(r"IČO[:\s&nbsp;]*(\d[\d\s]{5,11})", text, re.IGNORECASE)
            if ico_match2:
                result["ico"] = ico_match2.group(1).replace(" ", "").strip()

        name_match = re.search(
            r"Obchodné meno.*?<span[^>]*>([^<]+)</span>",
            text, re.DOTALL | re.IGNORECASE,
        )
        if name_match:
            result["name"] = name_match.group(1).strip()

    except Exception as e:
        logger.debug("Could not fetch detail from %s: %s", detail_url, e)
    return result


def _make_company_key(company: dict) -> str:
    """Create a unique key for a company record."""
    if company.get("ico"):
        return f"ico:{company['ico']}"
    if company.get("orsr_id"):
        return f"orsr:{company['orsr_id']}"
    return f"name:{company['companyName'].lower().strip()}"


def _compute_link_confidence(
    exact_match: bool,
    inactive: bool,
    total_results: int,
) -> str:
    """Determine confidence level for a politician-company link."""
    if not exact_match:
        return "low"
    if inactive:
        return "low"
    if total_results >= 15:
        return "low"
    if total_results >= 8:
        return "medium"
    return "high"


MAX_COMPANIES_PER_PERSON = 20
COMMON_NAME_THRESHOLD = 25


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

        if total_for_person > COMMON_NAME_THRESHOLD:
            logger.warning(
                "Name '%s' returned %d ORSR results (common name), "
                "keeping only exact matches",
                name, total_for_person,
            )
            orsr_results = [r for r in orsr_results if r.get("_exactMatch")]

        if len(orsr_results) > MAX_COMPANIES_PER_PERSON:
            logger.warning(
                "Name '%s' still has %d results after filtering, capping at %d",
                name, len(orsr_results), MAX_COMPANIES_PER_PERSON,
            )
            orsr_results = orsr_results[:MAX_COMPANIES_PER_PERSON]

        for company in orsr_results:
            confidence = _compute_link_confidence(
                exact_match=company.get("_exactMatch", False),
                inactive=company.get("_inactive", False),
                total_results=total_for_person,
            )

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
                    "inactive": company.get("_inactive", False),
                }

            entry = {
                "politicianId": politician["id"],
                "politicianName": politician["name"],
                "confidence": confidence,
                "signals": ["name_match"] + (["exact_name"] if company.get("_exactMatch") else []),
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
                        "inactive": company.get("_inactive", False),
                    }

                conf = compute_confidence(
                    name_match_exact=company.get("_exactMatch", False),
                )
                signals = get_confidence_signals(
                    name_match_exact=company.get("_exactMatch", False),
                )

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

    logger.info("Fetching details for %d companies from ORSR...", len(all_companies))
    for key, company in all_companies.items():
        if company.get("detailUrl"):
            detail = _get_detail_info(session, company["detailUrl"])
            if detail["ico"] and not company["ico"]:
                company["ico"] = detail["ico"]
            if detail["name"]:
                company["name"] = detail["name"]

    write_json("politicians.json", politicians)
    companies_list = list(all_companies.values())

    active = sum(1 for c in companies_list if not c.get("inactive"))
    inactive = sum(1 for c in companies_list if c.get("inactive"))
    logger.info(
        "Total unique companies: %d (active: %d, inactive: %d)",
        len(companies_list), active, inactive,
    )
    return companies_list
