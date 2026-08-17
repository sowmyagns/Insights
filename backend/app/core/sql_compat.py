"""Dialect-neutral SQL helpers for PostgreSQL (SQLAlchemy extract-based)."""

from sqlalchemy import and_, extract


def column_matches_year_month(column, month_key: str):
    """Return a clause matching *column* to a ``YYYY-MM`` string."""
    year_str, month_str = month_key.split("-", 1)
    return and_(
        extract("year", column) == int(year_str),
        extract("month", column) == int(month_str),
    )


def column_matches_month_number(column, month_number: int):
    """Return a clause matching *column* to a calendar month (1–12)."""
    return extract("month", column) == month_number
