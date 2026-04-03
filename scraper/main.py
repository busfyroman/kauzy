#!/usr/bin/env python3
"""CLI orchestrator for the Slovak Politicians data scraping pipeline."""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from config import OUTPUT_DIR, setup_logging
from utils import write_json, copy_output_to_frontend

logger = logging.getLogger(__name__)

STEPS = [
    "politicians",
    "wikidata",
    "companies",
    "kauzy",
    "procurement",
    "link",
    "score",
    "track",
]


def run_politicians() -> dict:
    """Scrape government + parliament members."""
    from scrapers.vlada import scrape_vlada
    from scrapers.nrsr import scrape_nrsr

    government = scrape_vlada()
    parliament = scrape_nrsr()

    write_json("government.json", government)
    write_json("parliament.json", parliament)

    all_politicians = government + parliament
    write_json("politicians.json", all_politicians)

    return {
        "government": len(government),
        "parliament": len(parliament),
        "total": len(all_politicians),
    }


def run_wikidata() -> dict:
    """Query Wikidata for spouse data."""
    from scrapers.wikidata import enrich_with_spouses

    count = enrich_with_spouses()
    return {"spouses_found": count}


def run_companies() -> dict:
    """Scrape companies from ORSR + RPVS."""
    from scrapers.companies import scrape_companies

    companies = scrape_companies()
    write_json("companies.json", companies)
    return {"companies": len(companies)}


def run_kauzy() -> dict:
    """Scrape kauzy.sk cases and actors."""
    from scrapers.kauzy import scrape_kauzy

    kauzy = scrape_kauzy()
    write_json("kauzy.json", kauzy)
    return {"kauzy": len(kauzy)}


def run_procurement() -> dict:
    """Download and process UVOstat + CRZ data."""
    from scrapers.procurement import scrape_procurement

    procurement = scrape_procurement()
    write_json("procurement.json", procurement)
    return {"procurement_records": len(procurement)}


def run_link() -> dict:
    """Run all linkers to connect entities."""
    from linkers.company_linker import link_companies
    from linkers.kauzy_linker import link_kauzy
    from linkers.procurement_linker import link_procurement

    c = link_companies()
    k = link_kauzy()
    p = link_procurement()
    return {"company_links": c, "kauzy_links": k, "procurement_links": p}


def run_score() -> dict:
    """Compute risk scores and build graph."""
    from scoring.risk_scorer import compute_scores

    stats = compute_scores()
    return stats


def run_track() -> dict:
    """Run change tracking and build search index."""
    from tracking.diff_engine import generate_changelog
    from tracking.search_indexer import build_search_index

    changes = generate_changelog()
    index_size = build_search_index()
    return {"changelog_entries": changes, "search_index_entries": index_size}


STEP_RUNNERS = {
    "politicians": run_politicians,
    "wikidata": run_wikidata,
    "companies": run_companies,
    "kauzy": run_kauzy,
    "procurement": run_procurement,
    "link": run_link,
    "score": run_score,
    "track": run_track,
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Slovak Politicians Data Scraper Pipeline"
    )
    parser.add_argument(
        "--step",
        choices=["all"] + STEPS,
        default="all",
        help="Which pipeline step to run (default: all)",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Max retries per HTTP request (default: 3)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP request timeout in seconds (default: 30)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--no-copy",
        action="store_true",
        help="Skip copying output to frontend/public/data/",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    import config
    config.MAX_RETRIES = args.retries
    config.REQUEST_TIMEOUT = args.timeout

    steps_to_run = STEPS if args.step == "all" else [args.step]
    metadata = {
        "run_started": datetime.now(timezone.utc).isoformat(),
        "steps": {},
        "errors": [],
    }

    for step in steps_to_run:
        logger.info("=" * 60)
        logger.info("Running step: %s", step)
        logger.info("=" * 60)
        start = time.time()

        try:
            runner = STEP_RUNNERS[step]
            result = runner()
            elapsed = time.time() - start
            metadata["steps"][step] = {
                "status": "success",
                "duration_seconds": round(elapsed, 2),
                "result": result,
            }
            logger.info("Step %s completed in %.1fs: %s", step, elapsed, result)
        except Exception as e:
            elapsed = time.time() - start
            error_msg = f"{step}: {type(e).__name__}: {e}"
            metadata["steps"][step] = {
                "status": "error",
                "duration_seconds": round(elapsed, 2),
                "error": error_msg,
            }
            metadata["errors"].append(error_msg)
            logger.error("Step %s failed after %.1fs: %s", step, elapsed, e, exc_info=True)

    metadata["run_finished"] = datetime.now(timezone.utc).isoformat()
    metadata["last_updated"] = datetime.now(timezone.utc).strftime("%d.%m.%Y")
    write_json("metadata.json", metadata)

    if not args.no_copy:
        copy_output_to_frontend()

    error_count = len(metadata["errors"])
    if error_count > 0:
        logger.warning("Pipeline finished with %d error(s)", error_count)
        sys.exit(1)
    else:
        logger.info("Pipeline finished successfully")


if __name__ == "__main__":
    main()
