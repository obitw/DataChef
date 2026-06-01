import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class DataFormat(str, enum.Enum):
    csv = "csv"
    json = "json"


class Datasource(Base):
    __tablename__ = "datasources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    name = Column(String, nullable=False)
    format = Column(Enum(DataFormat), nullable=False)
    raw_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", foreign_keys=[owner_id])
    group = relationship("Group", foreign_keys=[group_id])
    jobs = relationship("Job", back_populates="datasource")
