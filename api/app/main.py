from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db.base import Base
from app.db.session import engine
import app.models.user  # noqa: F401
import app.models.group  # noqa: F401
import app.models.datasource  # noqa: F401
import app.models.job  # noqa: F401
from app.routes import auth, health, groups


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="DataChef API",
    version="0.1.0",
    description="Plateforme de traitement de données asynchrone",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(groups.router)
