from fastapi import FastAPI
from sqlalchemy import text

from app.database.session import engine

from app.auth.router import router as auth_router

from app.employees.router import router as employee_router

from app.documents.router import router as documents_router

from contextlib import asynccontextmanager

from app.storage.minio import ensure_bucket_exists

from app.audit.router import router as audit_router

from app.notifications.router import router as notifications_router
from app.tasks.router import router as tasks_router

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_bucket_exists()

    yield

app = FastAPI(
    title="HR Document Management System API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(employee_router)
app.include_router(documents_router)
app.include_router(audit_router)
app.include_router(notifications_router)
app.include_router(tasks_router)

@app.get("/")
def root():
    return {
        "message": "HR Document Management System API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database()")
        )

        database = result.scalar()

    return {
        "status": "connected",
        "database": database
    }
