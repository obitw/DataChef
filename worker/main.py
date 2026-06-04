import asyncio
import signal
import logging
import uuid

import redis.asyncio as aioredis
from sqlalchemy import select, update

from config import settings
from db import AsyncSessionLocal
from models import Job, Datasource, JobStatus
from pipeline import run_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

shutdown = asyncio.Event()


def handle_sigterm(*_):
    log.info("SIGTERM received, shutting down...")
    shutdown.set()


async def run():
    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)

    redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    log.info("Worker started, listening on queue '%s'", settings.JOBS_QUEUE)

    while not shutdown.is_set():
        result = await redis.blpop(settings.JOBS_QUEUE, timeout=2)
        if result is None:
            continue
        _, job_id = result
        log.info("Picked up job %s", job_id)
        await process_job(job_id)

    await redis.aclose()
    log.info("Worker stopped cleanly")


async def process_job(job_id: str):
    async with AsyncSessionLocal() as db:
        # Transition pending → running
        stmt = (
            update(Job)
            .where(Job.id == uuid.UUID(job_id), Job.status == JobStatus.pending)
            .values(status=JobStatus.running)
            .returning(Job)
        )
        result = await db.execute(stmt)
        await db.commit()
        job = result.scalar_one_or_none()

        if job is None:
            log.warning("Job %s not found or already picked up", job_id)
            return

        try:
            ds_result = await db.execute(select(Datasource).where(Datasource.id == job.datasource_id))
            datasource = ds_result.scalar_one_or_none()

            if datasource is None:
                raise ValueError(f"Datasource {job.datasource_id} not found")

            output = run_pipeline(datasource.raw_data, datasource.format.value, job.pipeline)

            await db.execute(
                update(Job)
                .where(Job.id == job.id)
                .values(status=JobStatus.done, result=output)
            )
            await db.commit()
            log.info("Job %s done", job_id)

        except Exception as exc:
            log.error("Job %s failed: %s", job_id, exc)
            await db.execute(
                update(Job)
                .where(Job.id == job.id)
                .values(status=JobStatus.error, error_message=str(exc))
            )
            await db.commit()


if __name__ == "__main__":
    asyncio.run(run())
