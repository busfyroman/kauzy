"""Link companies to politicians based on ORSR and RPVS data."""
from __future__ import annotations

import logging

from utils import read_json, write_json

logger = logging.getLogger(__name__)


def link_companies() -> int:
    """Cross-reference companies with politicians and update both datasets."""
    politicians = read_json("politicians.json")
    companies = read_json("companies.json")

    if not politicians or not companies:
        logger.warning("Missing data for company linking")
        return 0

    company_by_ico = {}
    company_by_key = {}
    for c in companies:
        ico = c.get("ico", "")
        if ico:
            company_by_ico[ico] = c
        orsr_id = c.get("orsr_id", "")
        if orsr_id:
            company_by_key[f"orsr:{orsr_id}"] = c
        name_key = c.get("name", "").lower().strip()
        if name_key:
            company_by_key[f"name:{name_key}"] = c
        if ico:
            company_by_key[f"ico:{ico}"] = c

    link_count = 0

    for politician in politicians:
        actual_icos = []
        for ref in politician.get("companies", []):
            company = company_by_key.get(ref) or company_by_ico.get(ref)
            if company:
                ico = company.get("ico", "")
                if ico:
                    actual_icos.append(ico)
                existing_ids = [
                    p["politicianId"] for p in company.get("linkedPoliticians", [])
                ]
                if politician["id"] not in existing_ids:
                    company.setdefault("linkedPoliticians", []).append({
                        "politicianId": politician["id"],
                        "politicianName": politician["name"],
                        "confidence": "medium",
                        "signals": ["name_match"],
                    })
                    link_count += 1

        politician["companies"] = actual_icos

        for sc in politician.get("spouseCompanies", []):
            ico = sc.get("ico")
            if ico and ico in company_by_ico:
                company = company_by_ico[ico]
                company.setdefault("linkedSpouses", []).append({
                    "politicianId": politician["id"],
                    "spouseName": politician.get("spouse", {}).get("name", ""),
                    "confidence": sc.get("confidence", "medium"),
                    "signals": sc.get("signals", []),
                })
                link_count += 1

    write_json("politicians.json", politicians)
    write_json("companies.json", companies)
    logger.info("Created %d company links", link_count)
    return link_count
