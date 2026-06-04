from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any

from app.models.job import JobStatus


class JobCreate(BaseModel):
    name: str
    datasource_id: UUID
    pipeline: list[dict[str, Any]]


class JobOut(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    datasource_id: UUID
    status: JobStatus
    pipeline: list[dict[str, Any]]
    result: Any | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
