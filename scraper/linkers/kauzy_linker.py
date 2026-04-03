"""Link kauzy.sk actors to politicians in our dataset."""
from __future__ import annotations

import logging

from utils import read_json, write_json
from validators.identity import names_match, name_to_ascii

logger = logging.getLogger(__name__)


def link_kauzy() -> int:
    """Match kauzy actors to politicians and update both datasets."""
    politicians = read_json("politicians.json")
    kauzy_data = read_json("kauzy.json")

    if not politicians or not kauzy_data:
        logger.warning("Missing data for kauzy linking")
        return 0

    kauzy_list = kauzy_data.get("kauzy", []) if isinstance(kauzy_data, dict) else kauzy_data
    actors = kauzy_data.get("actors", []) if isinstance(kauzy_data, dict) else []

    politician_name_index = {}
    for p in politicians:
        key = name_to_ascii(p["name"])
        politician_name_index[key] = p

    link_count = 0

    for actor in actors:
        actor_key = name_to_ascii(actor["name"])

        matched_politician = politician_name_index.get(actor_key)
        if not matched_politician:
            for key, p in politician_name_index.items():
                if names_match(actor["name"], p["name"], threshold=88):
                    matched_politician = p
                    break

        if matched_politician:
            actor["matchedPoliticianId"] = matched_politician["id"]
            for kauza_ref in actor.get("kauzy", []):
                slug = kauza_ref.get("slug", "")
                if slug and slug not in matched_politician.get("kauzy", []):
                    matched_politician.setdefault("kauzy", []).append(slug)
                    link_count += 1

            logger.debug("Linked actor %s -> politician %s", actor["name"], matched_politician["name"])

    for kauza in kauzy_list:
        for actor in kauza.get("actors", []):
            actor_key = name_to_ascii(actor["name"])
            matched = politician_name_index.get(actor_key)
            if matched:
                actor["matchedPoliticianId"] = matched["id"]

    write_json("politicians.json", politicians)
    write_json("kauzy.json", kauzy_data)
    logger.info("Created %d kauzy links", link_count)
    return link_count
