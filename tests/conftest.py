import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402

from backend.app import create_app  # noqa: E402
from backend.app.models import db  # noqa: E402


@pytest.fixture()
def app():
    app = create_app(testing=True)
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()
