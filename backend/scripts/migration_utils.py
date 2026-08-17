"""Shared helpers for SQLite → PostgreSQL data migration."""

from __future__ import annotations

# Legacy HR archive tables present in old SQLite DBs but excluded from active schema.
LEGACY_HR_TABLES: frozenset[str] = frozenset(
    {
        "employees",
        "leave_requests",
        "shifts",
        "attendance_records",
        "payroll_records",
        "performance_reviews",
        "hr_assets",
        "safety_incidents",
        "job_openings",
        "recruitment_applicants",
        "training_programs",
        "training_enrollments",
    }
)


def active_schema_table_names() -> list[str]:
    """Return active ORM table names in FK-safe dependency order."""
    import app.models  # noqa: F401 — register models
    from app.models.base import Base

    return [table.name for table in Base.metadata.sorted_tables]


def tables_to_migrate(source_table_names: set[str]) -> list[str]:
    """Active-schema tables that also exist in the SQLite source."""
    ordered = active_schema_table_names()
    return [name for name in ordered if name in source_table_names and name not in LEGACY_HR_TABLES]
