"""Unit tests for robust datetime handling in _normalize_license_status and _as_aware."""

from datetime import datetime, timezone, timedelta
from app.services.account_overview_service import (
    _as_aware,
    _display_or_none,
    _iso,
    _normalize_license_status,
    _normalize_plan,
)


def test_as_aware_with_various_inputs():
    # None and empty strings
    assert _as_aware(None) is None
    assert _as_aware("") is None
    assert _as_aware("   ") is None

    # Invalid strings and malformed formats
    assert _as_aware("invalid-date") is None
    assert _as_aware("2026-99-99") is None
    assert _as_aware("not-a-datetime") is None

    # Unsupported objects
    assert _as_aware(object()) is None
    assert _as_aware(["list"]) is None

    # Valid ISO strings
    parsed = _as_aware("2026-08-14T21:00:00Z")
    assert parsed is not None
    assert parsed.tzinfo == timezone.utc

    # Naive datetime
    naive = datetime(2026, 8, 14, 12, 0, 0)
    aware = _as_aware(naive)
    assert aware is not None
    assert aware.tzinfo == timezone.utc

    # Timestamp numbers
    ts_aware = _as_aware(1700000000)
    assert ts_aware is not None
    assert ts_aware.tzinfo == timezone.utc


def test_iso_with_various_inputs():
    assert _iso(None) is None
    assert _iso("invalid") is None
    assert _iso(object()) is None

    valid = datetime(2026, 8, 14, 12, 0, 0, tzinfo=timezone.utc)
    assert _iso(valid) == "2026-08-14T12:00:00+00:00"


def test_display_or_none_handles_broken_str():
    assert _display_or_none(None) is None
    assert _display_or_none("") is None
    assert _display_or_none("   ") is None
    assert _display_or_none("  Hello  ") == "Hello"

    class BrokenStrObject:
        def __str__(self):
            raise RuntimeError("Corrupted __str__ implementation")

    assert _display_or_none(BrokenStrObject()) is None
    assert _normalize_plan(BrokenStrObject()) is None


def test_normalize_license_status_handles_malformed_datetime():
    # Malformed datetime inputs shouldn't crash
    status = _normalize_license_status(
        license_status="active",
        plan="growth",
        trial_expires_at="malformed-date-string",
        license_expires_at="invalid-iso-date",
    )
    assert status == "Active"

    # Arbitrary non-datetime objects
    status = _normalize_license_status(
        license_status="active",
        plan="scale",
        trial_expires_at=object(),
        license_expires_at=12345,  # Numeric timestamp in past
    )
    assert status == "Expired"

    # Past datetime
    past = datetime.now(timezone.utc) - timedelta(days=1)
    status = _normalize_license_status(
        license_status="active",
        plan="growth",
        trial_expires_at=None,
        license_expires_at=past,
    )
    assert status == "Expired"

    # Future datetime
    future = datetime.now(timezone.utc) + timedelta(days=30)
    status = _normalize_license_status(
        license_status="active",
        plan="growth",
        trial_expires_at=None,
        license_expires_at=future,
    )
    assert status == "Active"
