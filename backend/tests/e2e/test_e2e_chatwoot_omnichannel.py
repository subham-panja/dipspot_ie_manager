"""Opaque-box 4-Tier E2E Test Suite for Self-Hosted Chatwoot Omnichannel Integration."""

from tests.e2e.chatwoot_cases_tier1 import *  # noqa: F401, F403
from tests.e2e.chatwoot_cases_tier2 import *  # noqa: F401, F403
from tests.e2e.chatwoot_cases_tier3 import *  # noqa: F401, F403
from tests.e2e.chatwoot_cases_tier4 import *  # noqa: F401, F403
from tests.e2e.chatwoot_mock_server import chatwoot_e2e_isolation, fake_chatwoot_server  # noqa: F401
