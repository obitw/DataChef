from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.group import Group, group_users
from app.models.user import User


class GroupRepository:

    async def get_by_id(self, db: AsyncSession, group_id: UUID) -> Group | None:
        result = await db.execute(select(Group).where(Group.id == group_id))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession) -> list[Group]:
        result = await db.execute(select(Group))
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, group: Group) -> Group:
        db.add(group)
        await db.commit()
        await db.refresh(group)
        return group

    async def is_member(self, db: AsyncSession, user_id: UUID, group_id: UUID) -> bool:
        result = await db.execute(
            select(group_users).where(
                group_users.c.user_id == user_id,
                group_users.c.group_id == group_id,
            )
        )
        return result.first() is not None

    async def add_user(self, db: AsyncSession, user_id: UUID, group_id: UUID) -> None:
        await db.execute(
            group_users.insert().values(user_id=user_id, group_id=group_id)
        )
        await db.commit()

    async def list_members(self, db: AsyncSession, group_id: UUID) -> list[User]:
        result = await db.execute(
            select(User)
            .join(group_users, group_users.c.user_id == User.id)
            .where(group_users.c.group_id == group_id)
        )
        return list(result.scalars().all())
