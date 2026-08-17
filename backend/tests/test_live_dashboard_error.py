"""Tests: Live Dashboard exception handling.

Verifies that get_live_dashboard and live_dashboard_endpoint properly catch
database exceptions (SQLAlchemyError) and general exceptions, perform db.rollback(),
and return controlled error responses (HTTP 503 / HTTP 500).
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.analytics import live_dashboard_endpoint
from app.services.analytics_extended_service import get_live_dashboard


def test_get_live_dashboard_db_error():
    """SQLAlchemyError in get_live_dashboard triggers rollback and re-raises for endpoint handling."""
    mock_db = MagicMock()
    mock_db.scalar.side_effect = SQLAlchemyError("Database connection lost")
    mock_db.execute.side_effect = SQLAlchemyError("Database connection lost")

    with pytest.raises(SQLAlchemyError):
        get_live_dashboard(mock_db, tenant_id=1)

    mock_db.rollback.assert_called()


def test_live_dashboard_endpoint_handles_db_error():
    """live_dashboard_endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_live_dashboard", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            live_dashboard_endpoint(tenant_id=1, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Live Dashboard is temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


def test_live_dashboard_endpoint_handles_unexpected_error():
    """live_dashboard_endpoint converts generic Exception into HTTP 500."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_live_dashboard", side_effect=RuntimeError("Unexpected error")):
        with pytest.raises(HTTPException) as exc_info:
            live_dashboard_endpoint(tenant_id=1, db=mock_db)

    assert exc_info.value.status_code == 500
    assert "An unexpected error occurred" in exc_info.value.detail
