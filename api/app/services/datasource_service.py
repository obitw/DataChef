import csv
import io
import json
import os
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.datasource import DataFormat, Datasource
from app.models.user import User
from app.repositories.datasource_repository import DatasourceRepository
from app.repositories.group_repository import GroupRepository


class DatasourceService:

    def __init__(self):
        self.repo = DatasourceRepository()
        self.group_repo = GroupRepository()

    async def create(
        self,
        db: AsyncSession,
        user: User,
        file: UploadFile,
        name: str | None,
        group_id: UUID | None,
    ) -> Datasource:
        if group_id is not None:
            group = await self.group_repo.get_by_id(db, group_id)
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")

            if not await self.group_repo.is_member(db, user.id, group_id):
                raise HTTPException(
                    status_code=403,
                    detail="You are not a member of this group",
                )

        raw_data = await file.read()
        if not raw_data:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        try:
            text_data = raw_data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=400,
                detail="File must be UTF-8 encoded",
            ) from exc

        data_format = self._detect_format(file)
        normalized_data = self._validate_and_normalize(text_data, data_format)
        datasource_name = self._resolve_name(name, file.filename)

        datasource = Datasource(
            owner_id=user.id,
            group_id=group_id,
            name=datasource_name,
            format=data_format,
            raw_data=normalized_data,
        )

        return await self.repo.create(db, datasource)

    async def list_accessible(self, db: AsyncSession, user_id: UUID) -> list[Datasource]:
        return await self.repo.list_accessible(db, user_id)

    async def get_accessible_by_id(
        self,
        db: AsyncSession,
        user_id: UUID,
        datasource_id: UUID,
    ) -> Datasource:
        datasource = await self.repo.get_accessible_by_id(db, datasource_id, user_id)
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")
        return datasource

    async def get_columns(self, db: AsyncSession, user_id: UUID, datasource_id: UUID) -> list[str]:
        datasource = await self.get_accessible_by_id(db, user_id, datasource_id)
        raw = datasource.raw_data
        if datasource.format == DataFormat.csv:
            sample = raw[:4096]
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            except csv.Error:
                dialect = csv.excel  # type: ignore[assignment]
            reader = csv.DictReader(io.StringIO(raw), dialect=dialect)
            return list(reader.fieldnames or [])
        else:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed:
                first = parsed[0]
                if isinstance(first, dict):
                    return list(first.keys())
                return []
            if isinstance(parsed, dict):
                return list(parsed.keys())
            return []

    async def delete(self, db: AsyncSession, user_id: UUID, datasource_id: UUID) -> dict:
        datasource = await self.repo.get_accessible_by_id(db, datasource_id, user_id)
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")

        if datasource.owner_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Only datasource owner can delete it",
            )

        if await self.repo.has_running_or_pending_jobs(db, datasource_id):
            raise HTTPException(
                status_code=400,
                detail="Cannot delete datasource with pending or running jobs",
            )

        await self.repo.delete(db, datasource_id)
        return {"status": "deleted"}

    def _detect_format(self, file: UploadFile) -> DataFormat:
        filename = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()

        if filename.endswith(".csv") or content_type in {
            "text/csv",
            "application/vnd.ms-excel",
        }:
            return DataFormat.csv

        if filename.endswith(".json") or content_type == "application/json":
            return DataFormat.json

        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Use CSV or JSON",
        )

    def _validate_and_normalize(self, text_data: str, data_format: DataFormat) -> str:
        if data_format == DataFormat.csv:
            rows = list(csv.reader(io.StringIO(text_data)))
            if not rows:
                raise HTTPException(status_code=400, detail="CSV is empty")
            return text_data

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON file") from exc

        return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)

    def _resolve_name(self, explicit_name: str | None, filename: str | None) -> str:
        if explicit_name and explicit_name.strip():
            return explicit_name.strip()

        if filename:
            inferred_name, _ = os.path.splitext(filename)
            if inferred_name.strip():
                return inferred_name.strip()

        return "datasource"
