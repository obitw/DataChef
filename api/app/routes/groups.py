from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.schemas.group import GroupCreate, GroupOut, MemberOut
from app.services.group_service import GroupService
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/groups", tags=["groups"])

service = GroupService()


@router.get("/", response_model=list[GroupOut])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await service.list_groups(db)


@router.post("/", response_model=GroupOut, status_code=201)
async def create_group(
    payload: GroupCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.create_group(db, payload.name, user.id)


@router.post("/{group_id}/join")
async def join_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.join_group(db, user.id, group_id)


@router.get("/{group_id}/members", response_model=list[MemberOut])
async def list_members(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await service.list_members(db, group_id)
