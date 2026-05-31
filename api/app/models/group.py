import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


group_users = Table(
    "group_users",
    Base.metadata,
    Column("group_id", UUID(as_uuid=True), ForeignKey("groups.id"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now())
)


class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship(
        "User",
        secondary=group_users,
        back_populates="groups"
    )