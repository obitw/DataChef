from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

import redis.asyncio as aioredis

from app.core.config import settings
from app.models.job import Job, JobStatus
from app.models.datasource import Datasource
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreate


class JobService:

    def __init__(self):
        self.repo = JobRepository()

    async def create_job(
        self,
        db: AsyncSession,
        redis: aioredis.Redis,
        user: User,
        payload: JobCreate,
    ) -> Job:
        ds = await db.execute(
            select(Datasource).where(Datasource.id == payload.datasource_id)
        )
        if ds.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Datasource not found")

        job = Job(
            owner_id=user.id,
            datasource_id=payload.datasource_id,
            name=payload.name,
            pipeline=payload.pipeline,
            status=JobStatus.pending,
        )
        job = await self.repo.create(db, job)

        await redis.rpush(settings.JOBS_QUEUE, str(job.id))

        return job

    async def list_jobs(self, db: AsyncSession, user: User) -> list[Job]:
        return await self.repo.list_for_user(db, user.id)

    async def get_job(self, db: AsyncSession, user: User, job_id: UUID) -> Job:
        job = await self.repo.get_by_id(db, job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
