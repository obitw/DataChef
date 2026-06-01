from uuid import UUID
from typing import cast

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.datasource import DatasourceOut
from app.services.datasource_service import DatasourceService

router = APIRouter(prefix="/datasources", tags=["datasources"])

service = DatasourceService()


@router.post("", response_model=DatasourceOut, status_code=201)
async def create_datasource(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    group_id: UUID | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.create(db, user, file, name, group_id)


@router.get("", response_model=list[DatasourceOut])
async def list_datasources(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_id = cast(UUID, user.id)
    return await service.list_accessible(db, user_id)


@router.get("/{datasource_id}", response_model=DatasourceOut)
async def get_datasource(
    datasource_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_id = cast(UUID, user.id)
    return await service.get_accessible_by_id(db, user_id, datasource_id)


@router.delete("/{datasource_id}")
async def delete_datasource(
    datasource_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_id = cast(UUID, user.id)
    return await service.delete(db, user_id, datasource_id)
