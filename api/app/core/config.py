from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JOBS_QUEUE: str = "jobs_queue"

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
