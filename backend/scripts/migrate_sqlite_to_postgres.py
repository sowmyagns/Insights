#!/usr/bin/env python3
"""Copy active-schema data from SQLite to PostgreSQL (IDs and FKs preserved).

Does NOT modify the SQLite source file. Run only after ``alembic upgrade head``
on the PostgreSQL target.

Environment:
  SOURCE_DATABASE_URL  default: sqlite:///./smrt.db
  TARGET_DATABASE_URL  required for live run (postgresql+psycopg://...)

Examples:
  python scripts/migrate_sqlite_to_postgres.py --dry-run
  python scripts/migrate_sqlite_to_postgres.py
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.migration_utils import LEGACY_HR_TABLES, tables_to_migrate  # noqa: E402


def _engine(url: str, *, read_only: bool = False) -> Engine:
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        if read_only:
            # Open SQLite read-only when possible (URI mode).
            if url.startswith("sqlite:///") and "mode=ro" not in url:
                path = url.replace("sqlite:///", "", 1)
                url = f"sqlite:///file:{path}?mode=ro&uri=true"
    kwargs: dict = {"connect_args": connect_args}
    if url.startswith("postgresql"):
        kwargs.update(pool_pre_ping=True)
    return create_engine(url, **kwargs)


def _reset_pg_sequences(engine: Engine, table_names: list[str]) -> None:
    if not engine.url.drivername.startswith("postgresql"):
        return
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in table_names:
            if "id" not in {c["name"] for c in insp.get_columns(table)}:
                continue
            conn.execute(
                text(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {table}), 1),
                        true
                    )
                    """
                )
            )


def migrate(source_url: str, target_url: str, *, dry_run: bool = False) -> dict[str, int]:
    if not source_url.lower().startswith("sqlite"):
        raise SystemExit("SOURCE_DATABASE_URL must be sqlite: (read-only fallback source).")
    if not dry_run and not target_url.lower().startswith("postgresql"):
        raise SystemExit("TARGET_DATABASE_URL must be postgresql: for live migration.")

    source_engine = _engine(source_url, read_only=True)
    target_engine = _engine(target_url) if not dry_run else None

    source_tables = set(inspect(source_engine).get_table_names())
    plan = tables_to_migrate(source_tables)
    skipped_legacy = sorted(source_tables & set(LEGACY_HR_TABLES))
    counts: dict[str, int] = {}

    print(f"Active-schema tables to migrate: {len(plan)}")
    if skipped_legacy:
        print(f"Skipping legacy HR archive tables: {', '.join(skipped_legacy)}")

    if dry_run:
        with source_engine.connect() as src:
            for name in plan:
                row = src.execute(text(f'SELECT COUNT(*) FROM "{name}"')).scalar()
                counts[name] = int(row or 0)
                print(f"  [dry-run] {name}: {counts[name]} rows")
        return counts

    assert target_engine is not None
    metadata = MetaData()

    with source_engine.connect() as src, target_engine.begin() as tgt:
        tgt.execute(text("SET session_replication_role = 'replica'"))
        try:
            for name in plan:
                table = Table(name, metadata, autoload_with=source_engine)
                rows = src.execute(select(table)).mappings().all()
                if not rows:
                    counts[name] = 0
                    continue
                payload = [dict(row) for row in rows]
                tgt.execute(table.insert(), payload)
                counts[name] = len(payload)
                print(f"  migrated {name}: {counts[name]} rows")
        finally:
            tgt.execute(text("SET session_replication_role = 'origin'"))

    _reset_pg_sequences(target_engine, plan)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate SQLite active schema to PostgreSQL.")
    parser.add_argument("--dry-run", action="store_true", help="Count rows only; no writes.")
    parser.add_argument(
        "--source",
        default=os.environ.get("SOURCE_DATABASE_URL", "sqlite:///./smrt.db"),
        help="SQLite source URL (default: sqlite:///./smrt.db)",
    )
    parser.add_argument(
        "--target",
        default=os.environ.get("TARGET_DATABASE_URL", ""),
        help="PostgreSQL target URL (required unless --dry-run)",
    )
    args = parser.parse_args()

    if not args.dry_run and not args.target.strip():
        raise SystemExit("Set TARGET_DATABASE_URL or pass --target for live migration.")

    try:
        counts = migrate(args.source, args.target, dry_run=args.dry_run)
    except SQLAlchemyError as exc:
        raise SystemExit(f"Migration failed: {exc}") from exc

    total = sum(counts.values())
    print(f"Done. {len(counts)} tables, {total} total rows.")


if __name__ == "__main__":
    main()
