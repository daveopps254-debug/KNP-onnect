from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import init_db
import os

app = FastAPI(title="KNP Connect API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create uploads directory
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


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
