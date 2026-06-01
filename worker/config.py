from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JOBS_QUEUE: str = "jobs_queue"

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
