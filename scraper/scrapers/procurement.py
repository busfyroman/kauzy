"""Scraper for procurement data from CRZ (Centrálny register zmlúv)."""
from __future__ import annotations

import logging
import re

from bs4 import BeautifulSoup

from config import CRZ_BASE_URL
from utils import get_session, rate_limited_get, read_json

logger = logging.getLogger(__name__)


def _search_crz_by_ico(session, ico: str, company_name: str = "") -> list[dict]:
    """Search CRZ for contracts involving a company by IČO."""
    results = []
    if not ico or len(ico) < 6:
        return results

    try:
        search_url = f"{CRZ_BASE_URL}/2171273-sk/centralny-register-zmluv/"
        params = {"art_ico": ico}

        resp = rate_limited_get(
            session, search_url, domain="www.crz.gov.sk", params=params,
        )
        if resp.status_code != 200:
            return results

        soup = BeautifulSoup(resp.text, "lxml")
        table = soup.find("table")
        if not table:
            return results

        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 5:
                continue

            date_text = cells[0].get_text(strip=True)
            name_text = cells[1].get_text(strip=True)
            amount_text = cells[2].get_text(strip=True)
            supplier_text = cells[3].get_text(strip=True)
            buyer_text = cells[4].get_text(strip=True)

            detail_link = cells[1].find("a", href=True)
            detail_url = ""
            if detail_link:
                href = detail_link.get("href", "")
                detail_url = href if href.startswith("http") else f"{CRZ_BASE_URL}{href}"

            amount = 0.0
            amount_clean = re.sub(r"[^\d,.]", "", amount_text.replace("\xa0", ""))
            if amount_clean:
                try:
                    amount = float(amount_clean.replace(",", "."))
                except ValueError:
                    pass

            record = {
                "id": f"crz-{ico}-{len(results)}",
                "contractorIco": ico,
                "contractorName": supplier_text or company_name,
                "buyerName": buyer_text,
                "subject": name_text,
                "amount": amount,
                "date": date_text,
                "source": "crz",
                "detailUrl": detail_url,
            }
            results.append(record)

    except Exception as e:
        logger.warning("CRZ search failed for ICO %s: %s", ico, e)

    return results


def scrape_procurement() -> list[dict]:
    """Search CRZ for contracts involving politician-linked companies."""
    companies = read_json("companies.json")
    if not companies:
        logger.warning("No companies.json found, skipping procurement")
        return []

    session = get_session()
    all_records = []
    searched_icos = set()

    for company in companies:
        ico = company.get("ico", "")
        if not ico or ico in searched_icos:
            continue
        searched_icos.add(ico)

        records = _search_crz_by_ico(session, ico, company.get("name", ""))
        if records:
            logger.info(
                "Found %d contracts for %s (IČO: %s)",
                len(records), company.get("name", ""), ico,
            )
            all_records.extend(records[:20])

    logger.info("Total procurement records: %d", len(all_records))
    return all_records
