import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class DataFormat(str, enum.Enum):
    csv = "csv"
    json = "json"


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    done = "done"
    error = "error"


class Datasource(Base):
    __tablename__ = "datasources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    format = Column(Enum(DataFormat, name="dataformat"), nullable=False)
    raw_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    datasource_id = Column(UUID(as_uuid=True), ForeignKey("datasources.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(Enum(JobStatus, name="jobstatus"), nullable=False, default=JobStatus.pending)
    pipeline = Column(JSONB, nullable=False)
    result = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
