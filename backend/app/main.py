import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from tortoise.contrib.fastapi import RegisterTortoise

from app.config import get_settings
from app.db import TORTOISE_ORM
from app.routers import admin, auth, editorial, library, public, questionnaires
from app.seed import seed

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Le schéma est créé par les migrations (aerich upgrade), jamais ici.
    async with RegisterTortoise(app, config=TORTOISE_ORM, add_exception_handlers=True):
        await seed()
        yield


settings = get_settings()
app = FastAPI(
    title="HandiDiag API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/api/docs",
    openapi_url=None if settings.is_production else "/api/openapi.json",
)
app.include_router(public.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(editorial.router, prefix="/api")
app.include_router(library.router, prefix="/api")
app.include_router(questionnaires.router, prefix="/api")


@app.get("/api/health", include_in_schema=False)
async def health():
    return {"status": "ok"}
