# Phase 2 — PostgreSQL setup and data migration

Phase 1 prepared the codebase. The application **requires PostgreSQL at runtime** (`DATABASE_URL`).

**SQLite (`smrt.db`) is the read-only migration source only — never modified by these scripts.**

## Prerequisites

- Python deps: `pip install -r requirements.txt` (includes `psycopg`)
- PostgreSQL 16+ (Docker **or** native install)

### Option A — Docker

```powershell
cd backend
docker compose -f docker-compose.postgres.yml up -d
```

### Option B — Native PostgreSQL

Create database and user, then set credentials in `.env` (see below).

## 1. Configure environment

In `backend/.env` (do not commit):

```env
DATABASE_URL=postgresql+psycopg://insights_user:YOUR_PASSWORD@localhost:5432/insights_iva
```

For data migration scripts (optional):

```env
SOURCE_DATABASE_URL=sqlite:///./smrt.db
TARGET_DATABASE_URL=postgresql+psycopg://insights_user:YOUR_PASSWORD@localhost:5432/insights_iva
```

Automated tests may set `ALLOW_SQLITE_RUNTIME=1` with a throwaway SQLite file — do **not** use this in production.

## 2. Apply schema (PostgreSQL)

```powershell
cd backend
alembic upgrade head
```

This creates ~70 active-schema tables from SQLAlchemy models. Legacy HR archive tables are **not** created.

## 3. Dry-run data migration (safe — no writes)

```powershell
python scripts/migrate_sqlite_to_postgres.py --dry-run
```

## 4. Live data migration

```powershell
python scripts/migrate_sqlite_to_postgres.py
```

Preserves primary keys, FK order, password hashes, and business records. Skips legacy HR tables.

## 5. Validate

```powershell
python scripts/validate_migration.py
```

Exit code `0` = all active-schema row counts match.

## 6. Run backend against PostgreSQL

Ensure `DATABASE_URL` in `.env` points to PostgreSQL, then:

```powershell
uvicorn app.main:app --reload
```

Test login, RBAC, inventory, sales, accounting, production.

## 7. Rollback

The original `smrt.db` file is never modified. If PostgreSQL is unavailable, fix connectivity or restore from `scripts/backup_postgres.py` dumps — do not point runtime `DATABASE_URL` at SQLite.

## Sign-off checklist

- [ ] `alembic upgrade head` on PostgreSQL
- [ ] `migrate_sqlite_to_postgres.py` completed
- [ ] `validate_migration.py` — 0 mismatches
- [ ] Login + JWT auth
- [ ] CRUD on major modules
- [ ] No API 500 errors on critical paths
