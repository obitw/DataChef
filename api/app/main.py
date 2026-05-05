from fastapi import FastAPI
from app.routes import auth, health

app = FastAPI()

app.include_router(auth.router, prefix="/auth")
app.include_router(health.router)

@app.get("/")
async def root():
    return {"message": "API running"}