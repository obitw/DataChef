from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from uuid import UUID

from app.models.job import Job
from app.models.group import group_users


class JobRepository:

    async def create(self, db: AsyncSession, job: Job) -> Job:
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    async def get_by_id(self, db: AsyncSession, job_id: UUID) -> Job | None:
        result = await db.execute(select(Job).where(Job.id == job_id))
        return result.scalar_one_or_none()

    async def get_accessible_by_id(
        self, db: AsyncSession, job_id: UUID, user_id: UUID
    ) -> Job | None:
        gu1 = group_users.alias("gu1")
        gu2 = group_users.alias("gu2")

        group_member_ids = (
            select(gu2.c.user_id)
            .join(gu1, gu1.c.group_id == gu2.c.group_id)
            .where(gu1.c.user_id == user_id)
            .where(gu2.c.user_id != user_id)
            .scalar_subquery()
        )

        result = await db.execute(
            select(Job).where(
                Job.id == job_id,
                or_(
                    Job.owner_id == user_id,
                    Job.owner_id.in_(group_member_ids),
                ),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, db: AsyncSession, user_id: UUID) -> list[Job]:
        gu1 = group_users.alias("gu1")
        gu2 = group_users.alias("gu2")

        group_member_ids = (
            select(gu2.c.user_id)
            .join(gu1, gu1.c.group_id == gu2.c.group_id)
            .where(gu1.c.user_id == user_id)
            .where(gu2.c.user_id != user_id)
            .scalar_subquery()
        )

        result = await db.execute(
            select(Job).where(
                or_(
                    Job.owner_id == user_id,
                    Job.owner_id.in_(group_member_ids),
                )
            )
        )
        return list(result.scalars().all())
