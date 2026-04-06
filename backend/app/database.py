from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import (  # noqa: F401
        User, Post, Comment, Like, Group, GroupMember,
        Department, Notification, PostMedia, Message,
        GroupMessage, UserSettings, Story, Report,
    )
    # In production we rely on Alembic migrations.
    # For local development (SQLite) it's useful to bootstrap quickly.
    if settings.environment != "production" and "sqlite" in DATABASE_URL:
        Base.metadata.create_all(bind=engine)
