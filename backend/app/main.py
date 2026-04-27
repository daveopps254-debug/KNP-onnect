from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import init_db
import os
from app.config import get_settings
from app.observability import RequestIdMiddleware

app = FastAPI(title="KNP Connect API", version="1.0.0")
app.add_middleware(RequestIdMiddleware)

settings = get_settings()

# CORS: permissive only in development; locked down otherwise.
cors_origins = ["*"] if settings.environment == "development" else settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Local uploads are useful for development; production should use S3/MinIO.
if settings.environment != "production":
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(os.path.join(UPLOAD_DIR, "profiles"), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "posts"), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "covers"), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "groups"), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "stories"), exist_ok=True)

    # Serve uploaded files
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
from app.routers import auth, users, posts, groups, admin, notifications, settings, messages, stories, reports
from app import ws

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(groups.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(settings.router)
app.include_router(messages.router)
app.include_router(stories.router)
app.include_router(reports.router)
app.include_router(ws.router)


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    # Basic connectivity checks
    from app.database import engine
    from sqlalchemy import text

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/metrics")
async def metrics():
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST  # type: ignore
    except Exception:
        return {"error": "prometheus-client not installed"}

    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
