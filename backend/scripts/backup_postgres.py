"""PostgreSQL logical backup via pg_dump.

Usage (from backend/):
  python scripts/backup_postgres.py

Env:
  DATABASE_URL          — postgresql+psycopg://... (required)
  BACKUP_DIR            — default ./backups
  KEEP_BACKUPS          — number of backups to retain (default 14)
  PG_DUMP               — path to pg_dump binary (default: pg_dump on PATH)
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


def _pg_conn_args(database_url: str) -> list[str]:
    parsed = urlparse(database_url.replace("+psycopg", "", 1))
    if parsed.scheme not in ("postgresql", "postgres"):
        raise ValueError("DATABASE_URL must be a postgresql: URL")
    args = []
    if parsed.hostname:
        args.extend(["-h", parsed.hostname])
    if parsed.port:
        args.extend(["-p", str(parsed.port)])
    if parsed.username:
        args.extend(["-U", parsed.username])
    db_name = (parsed.path or "").lstrip("/")
    if not db_name:
        raise ValueError("DATABASE_URL must include a database name")
    args.append(db_name)
    return args


def main() -> int:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("ERROR: DATABASE_URL is required")
        return 1
    if not database_url.lower().startswith("postgresql"):
        print("ERROR: DATABASE_URL must be postgresql+psycopg://...")
        return 1

    try:
        pg_args = _pg_conn_args(database_url)
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    backup_dir = Path(os.getenv("BACKUP_DIR", str(_BACKEND_ROOT / "backups")))
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = backup_dir / f"insights_iva_{stamp}.sql"

    pg_dump = os.getenv("PG_DUMP", "pg_dump")
    env = os.environ.copy()
    parsed = urlparse(database_url.replace("+psycopg", "", 1))
    if parsed.password:
        env["PGPASSWORD"] = parsed.password

    cmd = [pg_dump, "--format=plain", "--no-owner", "--no-acl", "-f", str(dest), *pg_args]
    try:
        subprocess.run(cmd, check=True, env=env, capture_output=True, text=True)
    except FileNotFoundError:
        print(f"ERROR: {pg_dump} not found — install PostgreSQL client tools")
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"ERROR: pg_dump failed: {exc.stderr or exc.stdout or exc}")
        return 1

    print(f"Backup written: {dest}")

    keep = int(os.getenv("KEEP_BACKUPS", "14"))
    existing = sorted(
        backup_dir.glob("insights_iva_*.sql"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for stale in existing[keep:]:
        stale.unlink(missing_ok=True)
        print(f"Pruned old backup: {stale.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
