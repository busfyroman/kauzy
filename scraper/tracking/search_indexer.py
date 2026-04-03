"""Build search index JSON for frontend global search."""
from __future__ import annotations

import logging

from utils import read_json, write_json

logger = logging.getLogger(__name__)


def build_search_index() -> int:
    """Build search_index.json from all entity data."""
    index = []

    politicians = read_json("politicians.json") or []
    for p in politicians:
        keywords = [
            p.get("name", ""),
            p.get("party", ""),
            p.get("position", ""),
            p.get("institution", ""),
            p.get("region", ""),
        ]
        index.append({
            "id": f"p-{p['id']}",
            "type": "politician",
            "label": p["name"],
            "sublabel": p.get("position", ""),
            "photo": p.get("photo"),
            "keywords": " ".join(k for k in keywords if k).lower(),
        })

    companies = read_json("companies.json") or []
    for c in companies:
        keywords = [c.get("name", ""), c.get("ico", "")]
        index.append({
            "id": f"c-{c['ico']}",
            "type": "company",
            "label": c["name"],
            "sublabel": f"IČO: {c['ico']}",
            "keywords": " ".join(k for k in keywords if k).lower(),
        })

    kauzy_data = read_json("kauzy.json")
    kauzy_list = []
    if isinstance(kauzy_data, dict):
        kauzy_list = kauzy_data.get("kauzy", [])
    elif isinstance(kauzy_data, list):
        kauzy_list = kauzy_data

    for k in kauzy_list:
        keywords = [k.get("title", ""), k.get("description", "")[:100]]
        index.append({
            "id": f"k-{k['id']}",
            "type": "kauza",
            "label": k["title"],
            "sublabel": "",
            "keywords": " ".join(kw for kw in keywords if kw).lower(),
        })

    procurement = read_json("procurement.json") or []
    flagged = [r for r in procurement if r.get("flagged")]
    for r in flagged:
        keywords = [
            r.get("subject", ""),
            r.get("contractorName", ""),
            r.get("buyerName", ""),
        ]
        index.append({
            "id": f"z-{r['id']}",
            "type": "zakazka",
            "label": r.get("subject", "")[:80] or r.get("contractorName", ""),
            "sublabel": f"{r.get('amount', 0):,.0f} EUR",
            "keywords": " ".join(k for k in keywords if k).lower(),
        })

    write_json("search_index.json", index)
    logger.info("Search index built: %d entries", len(index))
    return len(index)
