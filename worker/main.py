import asyncio
import signal
import logging

import redis.asyncio as aioredis

from config import settings

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
    log.info("process_job(%s) — not yet implemented", job_id)


if __name__ == "__main__":
    asyncio.run(run())
