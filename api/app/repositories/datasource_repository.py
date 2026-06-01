from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.datasource import Datasource
from app.models.group import group_users
from app.models.job import Job, JobStatus


class DatasourceRepository:

    async def create(self, db: AsyncSession, datasource: Datasource) -> Datasource:
        db.add(datasource)
        await db.commit()
        await db.refresh(datasource)
        return datasource

    async def list_accessible(self, db: AsyncSession, user_id: UUID) -> list[Datasource]:
        result = await db.execute(
            select(Datasource)
            .outerjoin(group_users, group_users.c.group_id == Datasource.group_id)
            .where(
                or_(
                    Datasource.owner_id == user_id,
                    group_users.c.user_id == user_id,
                )
            )
            .order_by(Datasource.created_at.desc())
            .distinct()
        )
        return list(result.scalars().all())

    async def get_accessible_by_id(
        self,
        db: AsyncSession,
        datasource_id: UUID,
        user_id: UUID,
    ) -> Datasource | None:
        result = await db.execute(
            select(Datasource)
            .outerjoin(group_users, group_users.c.group_id == Datasource.group_id)
            .where(
                Datasource.id == datasource_id,
                or_(
                    Datasource.owner_id == user_id,
                    group_users.c.user_id == user_id,
                ),
            )
            .distinct()
        )
        return result.scalar_one_or_none()

    async def has_running_or_pending_jobs(
        self,
        db: AsyncSession,
        datasource_id: UUID,
    ) -> bool:
        result = await db.execute(
            select(Job.id).where(
                Job.datasource_id == datasource_id,
                Job.status.in_([JobStatus.pending, JobStatus.running]),
            )
        )
        return result.first() is not None

    async def delete(self, db: AsyncSession, datasource_id: UUID) -> None:
        await db.execute(delete(Datasource).where(Datasource.id == datasource_id))
        await db.commit()
