from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.user_repository import UserRepository
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User


class AuthService:

    def __init__(self):
        self.repo = UserRepository()

    async def register(self, db: AsyncSession, email: str, password: str):
        existing = await self.repo.get_by_email(db, email)

        if existing:
            raise HTTPException(status_code=400, detail="User already exists")

        user = User(
            email=email,
            password_hash=hash_password(password),
        )

        return await self.repo.create(db, user)

    async def login(self, db: AsyncSession, email: str, password: str):
        user = await self.repo.get_by_email(db, email)

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token({"sub": str(user.id)})

        return {
            "access_token": token,
            "token_type": "bearer"
        }
