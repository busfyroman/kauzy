"""Query Wikidata SPARQL API for spouse data of Slovak politicians."""
from __future__ import annotations

import logging
import json

from config import WIKIDATA_SPARQL_URL
from utils import get_session, read_json, write_json, rate_limited_get
from validators.identity import name_to_ascii

logger = logging.getLogger(__name__)

SPARQL_QUERY = """
SELECT DISTINCT ?politician ?politicianLabel ?spouse ?spouseLabel ?spouseDob ?spousePob ?spousePobLabel WHERE {
  ?politician wdt:P27 wd:Q214;
              wdt:P26 ?spouse.
  {
    ?politician wdt:P106/wdt:P279* wd:Q82955.
  } UNION {
    ?politician wdt:P39 ?position.
    ?position wdt:P279* wd:Q486839.
  } UNION {
    ?politician wdt:P39/wdt:P361* wd:Q3832858.
  } UNION {
    ?politician p:P39 ?posStmt.
    ?posStmt ps:P39 ?pos.
    VALUES ?pos { wd:Q18025862 wd:Q19803234 wd:Q109862577 }
  }
  OPTIONAL { ?spouse wdt:P569 ?spouseDob. }
  OPTIONAL { ?spouse wdt:P19 ?spousePob. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "sk,en". }
}
"""


def query_wikidata_spouses() -> list[dict]:
    """Fetch all Slovak politicians and their spouses from Wikidata."""
    session = get_session()
    params = {
        "query": SPARQL_QUERY,
        "format": "json",
    }
    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": "SlovakPoliticiansDashboard/1.0 (educational project)",
    }

    try:
        resp = rate_limited_get(
            session,
            WIKIDATA_SPARQL_URL,
            domain="query.wikidata.org",
            params=params,
            headers=headers,
        )
        data = resp.json()
        results = []
        for binding in data.get("results", {}).get("bindings", []):
            entry = {
                "politicianWikidataId": binding["politician"]["value"].split("/")[-1],
                "politicianName": binding.get("politicianLabel", {}).get("value", ""),
                "spouseWikidataId": binding["spouse"]["value"].split("/")[-1],
                "spouseName": binding.get("spouseLabel", {}).get("value", ""),
                "spouseDob": binding.get("spouseDob", {}).get("value", "")[:10] if "spouseDob" in binding else "",
                "spousePob": binding.get("spousePobLabel", {}).get("value", ""),
            }
            results.append(entry)

        logger.info("Wikidata returned %d politician-spouse pairs", len(results))
        return results

    except Exception as e:
        logger.error("Failed to query Wikidata: %s", e, exc_info=True)
        return []


def enrich_with_spouses() -> int:
    """Enrich politicians.json with spouse data from Wikidata."""
    politicians = read_json("politicians.json")
    if not politicians:
        logger.warning("No politicians.json found, skipping Wikidata enrichment")
        return 0

    spouse_data = query_wikidata_spouses()
    if not spouse_data:
        logger.warning("No spouse data from Wikidata")
        return 0

    name_index = {}
    for entry in spouse_data:
        key = name_to_ascii(entry["politicianName"])
        if key not in name_index:
            name_index[key] = []
        name_index[key].append(entry)

    matched = 0
    for politician in politicians:
        key = name_to_ascii(politician["name"])
        if key in name_index:
            spouse_entry = name_index[key][0]
            politician["spouse"] = {
                "name": spouse_entry["spouseName"],
                "wikidataId": spouse_entry["spouseWikidataId"],
                "source": "wikidata",
                "dob": spouse_entry.get("spouseDob", ""),
                "pob": spouse_entry.get("spousePob", ""),
            }
            matched += 1
            logger.debug(
                "Matched spouse for %s -> %s",
                politician["name"],
                spouse_entry["spouseName"],
            )

    write_json("politicians.json", politicians)
    logger.info("Enriched %d politicians with spouse data", matched)
    return matched
