"""Tests for exception handling during audience resolution query.
"""

from unittest.mock import MagicMock

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.alert_event_service import _resolve_audience_user_ids


def test_resolve_audience_user_ids_rolls_back_on_db_error():
    """Verify that a database error during _resolve_audience_user_ids triggers rollback and returns HTTP 503."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError(
        "SELECT users", {}, Exception("Database connection lost during audience lookup")
    )

    try:
        _resolve_audience_user_ids(mock_db, tenant_id=1, alert_type="low_stock")
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_resolve_audience_user_ids_rolls_back_on_generic_exception():
    """Verify that an unexpected error during _resolve_audience_user_ids triggers rollback and returns HTTP 500."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query failure")

    try:
        _resolve_audience_user_ids(mock_db, tenant_id=1, alert_type="low_stock")
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to resolve audience user IDs" in exc.detail
        mock_db.rollback.assert_called_once()
