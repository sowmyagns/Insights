#!/usr/bin/env python3
"""Create Insights Iva PostgreSQL role and database on a local PostgreSQL server.

Use when running native PostgreSQL (not Docker). Requires superuser credentials
from your PostgreSQL installation.

Usage (PowerShell, from backend/):
  $env:POSTGRES_ADMIN_PASSWORD = "your-postgres-install-password"
  python scripts/setup_postgres_local.py

Optional env:
  POSTGRES_ADMIN_USER     default: postgres
  POSTGRES_ADMIN_HOST     default: localhost
  POSTGRES_ADMIN_PORT     default: 5432
  APP_DB_USER             default: insights_user
  APP_DB_PASSWORD         default: insights_dev
  APP_DB_NAME             default: insights_iva
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def _ensure_role(cur, app_user: str, app_password: str) -> None:
    """Create or update the application role (password via sql.Literal, not %s)."""
    from psycopg import sql

    cur.execute(
        "SELECT 1 FROM pg_roles WHERE rolname = %s",
        (app_user,),
    )
    if cur.fetchone():
        print(f"Role '{app_user}' already exists - updating password.")
        cur.execute(
            sql.SQL("ALTER ROLE {} WITH LOGIN PASSWORD {}").format(
                sql.Identifier(app_user),
                sql.Literal(app_password),
            )
        )
    else:
        print(f"Creating role '{app_user}'.")
        cur.execute(
            sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD {}").format(
                sql.Identifier(app_user),
                sql.Literal(app_password),
            )
        )


def _ensure_database(cur, app_db: str, app_user: str) -> None:
    """Create the application database if missing."""
    from psycopg import sql

    cur.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        (app_db,),
    )
    if cur.fetchone():
        print(f"Database '{app_db}' already exists.")
    else:
        print(f"Creating database '{app_db}'.")
        cur.execute(
            sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(app_db),
                sql.Identifier(app_user),
            )
        )

    cur.execute(
        sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
            sql.Identifier(app_db),
            sql.Identifier(app_user),
        )
    )


def main() -> int:
    import psycopg

    admin_user = _env("POSTGRES_ADMIN_USER", "postgres")
    admin_password = _env("POSTGRES_ADMIN_PASSWORD", "")
    admin_host = _env("POSTGRES_ADMIN_HOST", "localhost")
    admin_port = int(_env("POSTGRES_ADMIN_PORT", "5432"))

    app_user = _env("APP_DB_USER", "insights_user")
    app_password = _env("APP_DB_PASSWORD", "insights_dev")
    app_db = _env("APP_DB_NAME", "insights_iva")

    if not admin_password:
        print(
            "ERROR: Set POSTGRES_ADMIN_PASSWORD to your PostgreSQL superuser password.\n"
            "Example:\n"
            '  $env:POSTGRES_ADMIN_PASSWORD = "your-password"\n'
            "  python scripts/setup_postgres_local.py"
        )
        return 1

    admin_dsn = (
        f"host={admin_host} port={admin_port} dbname=postgres "
        f"user={admin_user} password={admin_password}"
    )

    try:
        with psycopg.connect(admin_dsn, autocommit=True) as conn:
            with conn.cursor() as cur:
                _ensure_role(cur, app_user, app_password)
                _ensure_database(cur, app_db, app_user)

        app_dsn = (
            f"host={admin_host} port={admin_port} dbname={app_db} "
            f"user={app_user} password={app_password}"
        )
        with psycopg.connect(app_dsn) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        print("Setup complete.")
        print(
            "DATABASE_URL=postgresql+psycopg://"
            f"{app_user}@{admin_host}:{admin_port}/{app_db}"
        )
        print("(Set APP_DB_PASSWORD in .env or use the value from APP_DB_PASSWORD env var.)")
        return 0
    except psycopg.OperationalError as exc:
        print(f"ERROR: Could not connect as admin user '{admin_user}': {exc}")
        print("Check POSTGRES_ADMIN_PASSWORD and that PostgreSQL is running.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
