"""Conflict of interest risk scoring engine."""
from __future__ import annotations

import logging
import re
from datetime import datetime

from utils import read_json, write_json

logger = logging.getLogger(__name__)

WEIGHTS = {
    "timing": 0.25,
    "contract_value": 0.25,
    "concentration": 0.20,
    "directness": 0.15,
    "contract_count": 0.15,
}

SK_MONTHS = {
    "január": 1, "február": 2, "marec": 3, "apríl": 4,
    "máj": 5, "jún": 6, "júl": 7, "august": 8,
    "september": 9, "október": 10, "november": 11, "december": 12,
}

GOVT_START = datetime(2023, 10, 25)


def _parse_crz_date(date_str: str) -> datetime | None:
    """Parse CRZ date like '21.September2021' or '6.Október2025'."""
    if not date_str:
        return None
    m = re.match(r"(\d{1,2})\.(\w+)(\d{4})", date_str)
    if not m:
        return None
    day, month_sk, year = int(m.group(1)), m.group(2).lower(), int(m.group(3))
    month = SK_MONTHS.get(month_sk)
    if not month:
        return None
    try:
        return datetime(year, month, day)
    except ValueError:
        return None


def _score_timing(record: dict) -> float:
    """Higher score if contract was signed during current government's tenure."""
    dt = _parse_crz_date(record.get("date", ""))
    if dt is None:
        return 30.0
    if dt >= GOVT_START:
        months_since = (dt - GOVT_START).days / 30
        if months_since <= 6:
            return 95.0
        if months_since <= 12:
            return 80.0
        return 65.0
    months_before = (GOVT_START - dt).days / 30
    if months_before <= 12:
        return 40.0
    return 15.0


def _score_contract_value(record: dict, all_amounts: list[float]) -> float:
    """Score based on how the contract value compares to median."""
    amount = record.get("amount", 0)
    if amount <= 0:
        return 10.0
    if not all_amounts:
        return 30.0

    median = sorted(all_amounts)[len(all_amounts) // 2]
    if median <= 0:
        return 30.0

    ratio = amount / median
    if ratio > 10:
        return 100.0
    if ratio > 5:
        return 85.0
    if ratio > 2:
        return 65.0
    if ratio > 1:
        return 40.0
    if ratio > 0.5:
        return 20.0
    return 10.0


def _score_concentration(record: dict, buyer_contractor_counts: dict) -> float:
    """Score based on repeat business between contractor and buyer."""
    contractor = record.get("contractorIco", "")
    buyer = record.get("buyerName", "")
    if not contractor or not buyer:
        return 20.0

    key = f"{contractor}||{buyer}"
    count = buyer_contractor_counts.get(key, 1)

    if count >= 15:
        return 100.0
    if count >= 10:
        return 85.0
    if count >= 5:
        return 65.0
    if count >= 3:
        return 45.0
    return 15.0


def _score_directness(record: dict) -> float:
    """Score based on whether connection is direct or through spouse."""
    linked = record.get("linkedPoliticians", [])
    if not linked:
        return 0.0
    has_direct = any(p.get("relation") == "direct" for p in linked)
    if has_direct:
        return 100.0
    return 40.0


def _score_contract_count(record: dict, contractor_total_counts: dict) -> float:
    """Score based on total number of government contracts for this contractor."""
    contractor = record.get("contractorIco", "")
    if not contractor:
        return 20.0
    count = contractor_total_counts.get(contractor, 1)
    if count >= 20:
        return 100.0
    if count >= 10:
        return 75.0
    if count >= 5:
        return 50.0
    if count >= 3:
        return 30.0
    return 10.0


def compute_scores() -> dict:
    """Compute risk scores for all flagged procurement records and build graph."""
    politicians = read_json("politicians.json")
    companies = read_json("companies.json")
    procurement = read_json("procurement.json")
    kauzy_data = read_json("kauzy.json")

    if not politicians:
        logger.warning("No data for scoring")
        return {"scored": 0}

    flagged = [r for r in (procurement or []) if r.get("flagged")]

    all_amounts = [
        r["amount"] for r in (procurement or [])
        if r.get("amount") and r["amount"] > 0
    ]

    buyer_contractor_counts: dict[str, int] = {}
    contractor_total_counts: dict[str, int] = {}
    for r in (procurement or []):
        ico = r.get("contractorIco", "")
        buyer = r.get("buyerName", "")
        if ico and buyer:
            key = f"{ico}||{buyer}"
            buyer_contractor_counts[key] = buyer_contractor_counts.get(key, 0) + 1
        if ico:
            contractor_total_counts[ico] = contractor_total_counts.get(ico, 0) + 1

    scored_count = 0
    for record in flagged:
        linked = record.get("linkedPoliticians", [])
        if not linked:
            continue

        scores = {
            "timing": _score_timing(record),
            "contract_value": _score_contract_value(record, all_amounts),
            "concentration": _score_concentration(record, buyer_contractor_counts),
            "directness": _score_directness(record),
            "contract_count": _score_contract_count(record, contractor_total_counts),
        }

        total = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)
        record["riskScore"] = round(total, 1)
        record["riskBreakdown"] = {k: round(v, 1) for k, v in scores.items()}
        scored_count += 1

    if procurement:
        write_json("procurement.json", procurement)

    nodes = []
    edges = []
    node_ids = set()

    for p in politicians:
        pid = f"p-{p['id']}"
        if pid not in node_ids:
            nodes.append({
                "id": pid,
                "type": "politician",
                "label": p["name"],
                "institution": p.get("institution", ""),
                "party": p.get("party", ""),
                "photo": p.get("photo"),
            })
            node_ids.add(pid)

    for c in (companies or []):
        cid = f"c-{c['ico']}"
        if cid not in node_ids:
            nodes.append({
                "id": cid,
                "type": "company",
                "label": c["name"],
                "ico": c["ico"],
            })
            node_ids.add(cid)

        for lp in c.get("linkedPoliticians", []):
            edges.append({
                "source": f"p-{lp['politicianId']}",
                "target": cid,
                "type": "owner",
                "riskScore": None,
            })
        for ls in c.get("linkedSpouses", []):
            edges.append({
                "source": f"p-{ls['politicianId']}",
                "target": cid,
                "type": "spouse_company",
                "riskScore": None,
                "confidence": ls.get("confidence", "medium"),
            })

    kauzy_list = []
    if isinstance(kauzy_data, dict):
        kauzy_list = kauzy_data.get("kauzy", [])

    for k in kauzy_list:
        kid = f"k-{k['id']}"
        if kid not in node_ids:
            nodes.append({
                "id": kid,
                "type": "kauza",
                "label": k["title"],
            })
            node_ids.add(kid)

        for actor in k.get("actors", []):
            if actor.get("matchedPoliticianId"):
                edges.append({
                    "source": f"p-{actor['matchedPoliticianId']}",
                    "target": kid,
                    "type": "involved",
                    "riskScore": None,
                })

    for record in flagged:
        rid = f"z-{record['id']}"
        if rid not in node_ids:
            nodes.append({
                "id": rid,
                "type": "zakazka",
                "label": record.get("subject", "")[:80],
                "amount": record.get("amount", 0),
                "date": record.get("date", ""),
            })
            node_ids.add(rid)

        cid = f"c-{record['contractorIco']}"
        edges.append({
            "source": cid,
            "target": rid,
            "type": "contractor",
            "riskScore": record.get("riskScore"),
        })

    graph = {"nodes": nodes, "edges": edges}
    write_json("graph.json", graph)

    logger.info("Risk scoring complete: %d scored, graph: %d nodes, %d edges",
                scored_count, len(nodes), len(edges))
    return {"scored": scored_count, "nodes": len(nodes), "edges": len(edges)}
