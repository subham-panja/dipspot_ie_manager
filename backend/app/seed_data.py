"""Pre-verified seed datasets for global importers and West Bengal rice mills."""

from typing import Dict, List, Any
from app.seed.importers_uae import SEED_IMPORTERS_UAE
from app.seed.importers_saudi_qatar import SEED_IMPORTERS_SAUDI_QATAR
from app.seed.mills_burdwan import SEED_MILLS_BURDWAN
from app.seed.mills_other import SEED_MILLS_OTHER

SEED_IMPORTERS: List[Dict[str, Any]] = SEED_IMPORTERS_UAE + SEED_IMPORTERS_SAUDI_QATAR
SEED_WB_MILLS: List[Dict[str, Any]] = SEED_MILLS_BURDWAN + SEED_MILLS_OTHER
SEED_LEADS: List[Dict[str, Any]] = SEED_IMPORTERS + SEED_WB_MILLS

__all__ = [
    "SEED_LEADS",
    "SEED_IMPORTERS",
    "SEED_WB_MILLS",
    "SEED_IMPORTERS_UAE",
    "SEED_IMPORTERS_SAUDI_QATAR",
    "SEED_MILLS_BURDWAN",
    "SEED_MILLS_OTHER",
]
