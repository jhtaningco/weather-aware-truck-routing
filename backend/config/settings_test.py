"""Settings used by pytest: safe defaults, always the local-memory cache."""

import os

os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("SECRET_KEY", "test-only-key")
os.environ["REDIS_URL"] = ""

from .settings import *  # noqa: E402, F403
