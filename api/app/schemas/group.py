from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class GroupCreate(BaseModel):
    name: str


class GroupOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberOut(BaseModel):
    id: UUID
    email: str

    model_config = {"from_attributes": True}
