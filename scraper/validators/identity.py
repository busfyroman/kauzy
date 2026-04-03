"""Name normalization and identity matching utilities."""
from __future__ import annotations

import re
import logging
from unidecode import unidecode
from thefuzz import fuzz

logger = logging.getLogger(__name__)

TITLE_PREFIXES = [
    "JUDr.", "Ing.", "Mgr.", "PhDr.", "MUDr.", "RNDr.", "PaedDr.",
    "ThDr.", "Doc.", "Prof.", "Dr.", "Bc.", "MBA", "PhD.", "CSc.",
    "DrSc.", "art.", "Arch.", "MVDr.", "RSDr.", "ThLic.", "ICDr.",
]


def normalize_name(name: str) -> str:
    """Normalize a name: strip titles, extra whitespace, convert 'Last, First' to 'First Last'."""
    result = name.strip()
    for title in sorted(TITLE_PREFIXES, key=len, reverse=True):
        result = result.replace(title, "")
    result = re.sub(r"\s+", " ", result).strip()
    if "," in result:
        parts = result.split(",", 1)
        result = f"{parts[1].strip()} {parts[0].strip()}"
    return result


def name_to_ascii(name: str) -> str:
    """Convert name to ASCII for comparison."""
    return unidecode(normalize_name(name)).lower().strip()


def names_match(name_a: str, name_b: str, threshold: int = 90) -> bool:
    """Check if two names match using fuzzy matching."""
    a = name_to_ascii(name_a)
    b = name_to_ascii(name_b)

    if a == b:
        return True

    ratio = fuzz.token_sort_ratio(a, b)
    return ratio >= threshold


def exact_name_match(name_a: str, name_b: str) -> bool:
    """Strict name comparison (ASCII, no titles, lowered)."""
    return name_to_ascii(name_a) == name_to_ascii(name_b)


def split_name(full_name: str) -> tuple[str, str]:
    """Split 'Surname, FirstName' or 'FirstName Surname' into (first, last)."""
    cleaned = full_name.strip()
    for title in sorted(TITLE_PREFIXES, key=len, reverse=True):
        cleaned = cleaned.replace(title, "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if "," in cleaned:
        parts = cleaned.split(",", 1)
        return parts[1].strip(), parts[0].strip()
    parts = cleaned.split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    return cleaned, ""


def compute_confidence(
    name_match_exact: bool,
    same_city: bool = False,
    rpvs_match: bool = False,
    birth_date_match: bool = False,
) -> str:
    """Compute confidence level for a person-entity link."""
    if not name_match_exact:
        return "low"
    secondary_signals = sum([same_city, rpvs_match, birth_date_match])
    if secondary_signals >= 1:
        return "high"
    return "medium"


def get_confidence_signals(
    name_match_exact: bool,
    same_city: bool = False,
    rpvs_match: bool = False,
    birth_date_match: bool = False,
) -> list[str]:
    """Return list of signal names that were positive."""
    signals = []
    if name_match_exact:
        signals.append("name_match")
    if same_city:
        signals.append("same_city")
    if rpvs_match:
        signals.append("rpvs_match")
    if birth_date_match:
        signals.append("birth_date_match")
    return signals
