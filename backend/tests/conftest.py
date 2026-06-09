from __future__ import annotations
import os
import sys
from pathlib import Path

os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-prod-min32chars-padding-x")
os.environ.setdefault("ENVIRONMENT", "development")

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from main import app
    with TestClient(app) as c:
        yield c
