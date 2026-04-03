"""Change tracking: compare current vs previous data and generate changelog."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from utils import read_json, write_json
from config import OUTPUT_DIR

logger = logging.getLogger(__name__)

MAX_CHANGELOG_DAYS = 90


def _load_previous(filename: str) -> dict | list | None:
    """Load previous version from git or backup."""
    backup_path = OUTPUT_DIR / f".prev_{filename}"
    if backup_path.exists():
        with open(backup_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_as_previous(filename: str) -> None:
    """Save current version as previous for next diff."""
    current_path = OUTPUT_DIR / filename
    backup_path = OUTPUT_DIR / f".prev_{filename}"
    if current_path.exists():
        import shutil
        shutil.copy2(current_path, backup_path)


def _diff_politicians(old_list: list, new_list: list) -> list[dict]:
    """Find changes in politician data."""
    changes = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    old_by_id = {p["id"]: p for p in old_list}
    new_by_id = {p["id"]: p for p in new_list}

    for pid, p in new_by_id.items():
        if pid not in old_by_id:
            changes.append({
                "date": today,
                "type": "new_politician",
                "politician": pid,
                "detail": f"Nový politik: {p['name']} ({p.get('position', '')})",
                "severity": "high",
            })
            continue

        old_p = old_by_id[pid]

        new_companies = set(p.get("companies", [])) - set(old_p.get("companies", []))
        for ico in new_companies:
            changes.append({
                "date": today,
                "type": "new_company_link",
                "politician": pid,
                "detail": f"Nové prepojenie na firmu: ICO {ico}",
                "severity": "high",
            })

        new_kauzy = set(p.get("kauzy", [])) - set(old_p.get("kauzy", []))
        for k in new_kauzy:
            changes.append({
                "date": today,
                "type": "new_kauza_link",
                "politician": pid,
                "detail": f"Nové prepojenie na kauzu: {k}",
                "severity": "medium",
            })

        if p.get("position") != old_p.get("position"):
            changes.append({
                "date": today,
                "type": "position_change",
                "politician": pid,
                "detail": f"Zmena pozície: {old_p.get('position', '')} -> {p.get('position', '')}",
                "severity": "medium",
            })

    for pid in old_by_id:
        if pid not in new_by_id:
            changes.append({
                "date": today,
                "type": "removed_politician",
                "politician": pid,
                "detail": f"Politik odstránený: {old_by_id[pid]['name']}",
                "severity": "medium",
            })

    return changes


def generate_changelog() -> int:
    """Generate changelog by comparing current data with previous version."""
    all_changes = []

    existing = read_json("changelog.json")
    if isinstance(existing, list):
        cutoff = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        all_changes = [
            c for c in existing
            if c.get("date", "") >= _cutoff_date()
        ]

    old_politicians = _load_previous("politicians.json")
    new_politicians = read_json("politicians.json")

    if old_politicians and new_politicians:
        changes = _diff_politicians(old_politicians, new_politicians)
        all_changes.extend(changes)
        logger.info("Found %d politician changes", len(changes))

    _save_as_previous("politicians.json")
    _save_as_previous("companies.json")
    _save_as_previous("kauzy.json")
    _save_as_previous("procurement.json")

    all_changes.sort(key=lambda c: c.get("date", ""), reverse=True)
    write_json("changelog.json", all_changes)
    logger.info("Changelog: %d total entries", len(all_changes))
    return len(all_changes)


def _cutoff_date() -> str:
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_CHANGELOG_DAYS)
    return cutoff.strftime("%Y-%m-%d")
