"""Link procurement contracts to politician-connected companies."""
from __future__ import annotations

import logging

from utils import read_json, write_json

logger = logging.getLogger(__name__)


def link_procurement() -> int:
    """Cross-reference procurement contractor ICOs with politician-linked companies."""
    politicians = read_json("politicians.json")
    companies = read_json("companies.json")
    procurement = read_json("procurement.json")

    if not politicians or not procurement:
        logger.warning("Missing data for procurement linking")
        return 0

    politician_icos = set()
    ico_to_politicians = {}

    for p in politicians:
        for ico in p.get("companies", []):
            if ico and len(str(ico)) >= 6:
                politician_icos.add(str(ico))
                ico_to_politicians.setdefault(str(ico), []).append({
                    "id": p["id"],
                    "name": p["name"],
                    "relation": "direct",
                })
        for sc in p.get("spouseCompanies", []):
            ico = sc.get("ico")
            if ico and len(str(ico)) >= 6:
                politician_icos.add(str(ico))
                ico_to_politicians.setdefault(str(ico), []).append({
                    "id": p["id"],
                    "name": p["name"],
                    "relation": "spouse",
                    "confidence": sc.get("confidence", "medium"),
                })

    logger.info("Tracking %d unique ICOs from politicians", len(politician_icos))

    link_count = 0
    for record in procurement:
        contractor_ico = str(record.get("contractorIco", "")).strip()
        if contractor_ico in politician_icos:
            record["linkedPoliticians"] = ico_to_politicians.get(contractor_ico, [])
            record["flagged"] = True

            for pol_ref in record["linkedPoliticians"]:
                pol_id = pol_ref["id"]
                for p in politicians:
                    if p["id"] == pol_id:
                        rec_id = record.get("id", "")
                        if rec_id and rec_id not in p.get("procurement", []):
                            p.setdefault("procurement", []).append(rec_id)
                        break

            link_count += 1
        else:
            record["linkedPoliticians"] = []
            record["flagged"] = False

    write_json("politicians.json", politicians)
    write_json("procurement.json", procurement)
    logger.info("Flagged %d procurement records linked to politicians", link_count)
    return link_count
