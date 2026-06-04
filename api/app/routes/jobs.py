from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

import redis.asyncio as aioredis

from app.db.session import get_db
from app.db.redis import get_redis
from app.schemas.job import JobCreate, JobOut
from app.services.job_service import JobService
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/jobs", tags=["jobs"])

service = JobService()


@router.post("/", response_model=JobOut, status_code=201)
async def create_job(
    payload: JobCreate,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
    user: User = Depends(get_current_user),
):
    return await service.create_job(db, redis, user, payload)


@router.get("/", response_model=list[JobOut])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.list_jobs(db, user)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.get_job(db, user, job_id)
