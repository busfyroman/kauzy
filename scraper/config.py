"""Central configuration for scraper pipeline."""

from pathlib import Path
import logging

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
PHOTOS_DIR = OUTPUT_DIR / "photos"
FRONTEND_DATA_DIR = BASE_DIR.parent / "frontend" / "public" / "data"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

# HTTP settings
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
RETRY_BACKOFF_FACTOR = 2.0
RATE_LIMIT_DELAY = 1.5  # seconds between requests to same domain

# Scraper-specific URLs
VLADA_BASE_URL = "https://www.vlada.gov.sk"
VLADA_MEMBERS_URL = f"{VLADA_BASE_URL}/vlada-sr/clenovia-vlady/"
VLADA_ADVISORS_URL = f"{VLADA_BASE_URL}/vlada-sr/zbor-poradcov/"
VLADA_PLENIPOTENTIARIES_URL = f"{VLADA_BASE_URL}/vlada-sr/splnomocnenci-vlady/"

NRSR_BASE_URL = "https://www.nrsr.sk/web"
NRSR_MEMBERS_URL = f"{NRSR_BASE_URL}/Default.aspx?SectionId=60"

WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"

ORSR_BASE_URL = "https://www.orsr.sk"

RPVS_API_URL = "https://rpvs.gov.sk/opendatav2"

KAUZY_BASE_URL = "https://kauzy.sk"

UVOSTAT_DOWNLOAD_URL = "https://www.uvostat.sk/download"

CRZ_BASE_URL = "https://www.crz.gov.sk"

# Size guard: abort if output shrinks by more than this percentage
SIZE_GUARD_THRESHOLD = 0.5

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7",
}


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
