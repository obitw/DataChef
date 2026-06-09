from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from uuid import UUID

from app.repositories.group_repository import GroupRepository
from app.models.group import Group


class GroupService:

    def __init__(self):
        self.repo = GroupRepository()

    async def list_groups(self, db: AsyncSession) -> list[Group]:
        return await self.repo.get_all(db)

    async def create_group(self, db: AsyncSession, name: str, user_id: UUID) -> Group:
        group = Group(name=name)
        group = await self.repo.create(db, group)
        await self.repo.add_user(db, user_id, group.id)
        return group

    async def join_group(self, db: AsyncSession, user_id: UUID, group_id: UUID) -> dict:
        group = await self.repo.get_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        if await self.repo.is_member(db, user_id, group_id):
            raise HTTPException(status_code=400, detail="Vous êtes déjà membre de ce groupe.")

        await self.repo.add_user(db, user_id, group_id)
        return {"status": "joined"}

    async def list_members(self, db: AsyncSession, group_id: UUID):
        group = await self.repo.get_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return await self.repo.list_members(db, group_id)
