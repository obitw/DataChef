from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from app.models.datasource import DataFormat


class DatasourceOut(BaseModel):
    id: UUID
    owner_id: UUID
    group_id: UUID | None
    name: str
    format: DataFormat
    created_at: datetime

    model_config = {"from_attributes": True}
