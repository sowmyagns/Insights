from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load .env from backend/ (ensures correct path regardless of cwd)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_sqlite_schema() -> None:
    """Add missing columns for older local SQLite databases before seeding."""
    if not settings.database_url.strip().lower().startswith("sqlite:"):
        return

    with engine.begin() as conn:
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()}
        if "profile_image" not in columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN profile_image TEXT")
        if "last_activity_at" not in columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN last_activity_at DATETIME")
