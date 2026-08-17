"""Tests: Finance Analytics exception handling.

Verifies that get_finance_analytics and finance_analytics_endpoint
properly catch database exceptions (SQLAlchemyError) and general exceptions
during finance summary generation, perform db.rollback(), and return
controlled error responses (HTTP 503 / HTTP 500).
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.analytics import finance_analytics_endpoint
from app.services.analytics_extended_service import get_finance_analytics


def test_get_finance_analytics_db_error():
    """SQLAlchemyError in get_finance_analytics triggers rollback and re-raises."""
    mock_db = MagicMock()
    mock_db.scalar.side_effect = SQLAlchemyError("Database connection lost")
    mock_db.scalars.side_effect = SQLAlchemyError("Database connection lost")
    mock_db.execute.side_effect = SQLAlchemyError("Database connection lost")

    with patch("app.services.analytics_extended_service.get_profit_analysis", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(SQLAlchemyError):
            get_finance_analytics(mock_db, tenant_id=1)

    mock_db.rollback.assert_called()


def test_finance_analytics_endpoint_handles_db_error():
    """finance_analytics_endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_finance_analytics", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            finance_analytics_endpoint(tenant_id=1, year=2024, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Finance Analytics is temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


def test_finance_analytics_endpoint_handles_unexpected_error():
    """finance_analytics_endpoint converts generic Exception into HTTP 500."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_finance_analytics", side_effect=RuntimeError("Unexpected error")):
        with pytest.raises(HTTPException) as exc_info:
            finance_analytics_endpoint(tenant_id=1, year=2024, db=mock_db)

    assert exc_info.value.status_code == 500
    assert "An unexpected error occurred" in exc_info.value.detail
