#!/usr/bin/env python3
"""Compare row counts between SQLite source and PostgreSQL target (active schema)."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.migration_utils import tables_to_migrate  # noqa: E402


def _count(engine, table: str) -> int:
    with engine.connect() as conn:
        return int(conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar() or 0)


def validate(source_url: str, target_url: str) -> int:
    src = create_engine(source_url, connect_args={"check_same_thread": False})
    tgt = create_engine(target_url, pool_pre_ping=True)

    source_tables = set(inspect(src).get_table_names())
    plan = tables_to_migrate(source_tables)

    mismatches = 0
    print(f"{'Table':<40} {'SQLite':>10} {'PostgreSQL':>12} {'Status'}")
    print("-" * 78)

    for table in plan:
        s_count = _count(src, table)
        t_count = _count(tgt, table)
        ok = s_count == t_count
        status = "OK" if ok else "MISMATCH"
        if not ok:
            mismatches += 1
        print(f"{table:<40} {s_count:>10} {t_count:>12} {status}")

    print("-" * 78)
    print(f"Mismatches: {mismatches}")
    return mismatches


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate SQLite → PostgreSQL row counts.")
    parser.add_argument(
        "--source",
        default=os.environ.get("SOURCE_DATABASE_URL", "sqlite:///./smrt.db"),
    )
    parser.add_argument(
        "--target",
        default=os.environ.get("TARGET_DATABASE_URL", ""),
        required=not os.environ.get("TARGET_DATABASE_URL"),
    )
    args = parser.parse_args()

    if not args.target.strip():
        raise SystemExit("Set TARGET_DATABASE_URL or pass --target.")

    code = 0 if validate(args.source, args.target) == 0 else 1
    raise SystemExit(code)


if __name__ == "__main__":
    main()
