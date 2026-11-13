import os

os.environ["DATABASE_URL"] = "sqlite://:memory:"
os.environ["ADMIN_PASSWORD"] = "Test-Password-2026"

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from tortoise import Tortoise  # noqa: E402

from app.auth import login_throttle  # noqa: E402
from app.db import TORTOISE_ORM  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(autouse=True)
async def database():
    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()
    await seed()
    login_throttle._failures.clear()
    yield
    await Tortoise._drop_databases()


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def admin(client):
    response = await client.post(
        "/api/auth/login", json={"username": "admin", "password": "Test-Password-2026"}
    )
    assert response.status_code == 200
    return client
