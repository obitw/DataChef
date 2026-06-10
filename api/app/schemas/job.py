from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Annotated, Any, Literal, Union

from app.models.job import JobStatus

AggFunction = Literal["sum", "avg", "median", "min", "max", "count"]
FilterOperator = Literal[">", "<", ">=", "<=", "==", "!="]


class FilterStep(BaseModel):
    op: Literal["filter"]
    column: str
    operator: FilterOperator
    value: Any


class SelectStep(BaseModel):
    op: Literal["select"]
    columns: list[str] = Field(min_length=1)


class SortStep(BaseModel):
    op: Literal["sort"]
    column: str
    order: Literal["asc", "desc"] = "asc"


class LimitStep(BaseModel):
    op: Literal["limit"]
    n: int = Field(gt=0)


class DeduplicateStep(BaseModel):
    op: Literal["deduplicate"]
    columns: list[str] = Field(min_length=1)


class AggregateStep(BaseModel):
    op: Literal["aggregate"]
    columns: list[str] = Field(min_length=1)
    functions: list[AggFunction] = Field(min_length=1)


class GroupByAggregate(BaseModel):
    column: str
    function: AggFunction


class GroupByStep(BaseModel):
    op: Literal["group_by"]
    by: str
    aggregate: GroupByAggregate


PipelineStep = Annotated[
    Union[
        FilterStep,
        SelectStep,
        SortStep,
        LimitStep,
        DeduplicateStep,
        AggregateStep,
        GroupByStep,
    ],
    Field(discriminator="op"),
]


class JobCreate(BaseModel):
    name: str
    datasource_id: UUID
    pipeline: list[PipelineStep] = Field(min_length=1)


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
