"""Tests: Profit Analysis exception handling.

Verifies that get_profit_analysis and profit_analysis_endpoint properly
catch database exceptions (SQLAlchemyError) and general exceptions (e.g. from get_profit_loss),
perform db.rollback(), and return controlled error responses (HTTP 503 / HTTP 500).
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.analytics import profit_analysis_endpoint
from app.services.analytics_service import get_profit_analysis


def test_get_profit_analysis_handles_get_profit_loss_db_error():
    """SQLAlchemyError inside get_profit_loss triggers db.rollback and re-raises."""
    mock_db = MagicMock()

    with patch("app.services.accounts_service.get_profit_loss", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(SQLAlchemyError):
            get_profit_analysis(mock_db, tenant_id=1, year=2024)

    mock_db.rollback.assert_called_once()


def test_get_profit_analysis_handles_get_profit_loss_generic_error():
    """Generic Exception inside get_profit_loss is caught, logged, and re-raised."""
    mock_db = MagicMock()

    with patch("app.services.accounts_service.get_profit_loss", side_effect=RuntimeError("Calculation failure")):
        with pytest.raises(RuntimeError):
            get_profit_analysis(mock_db, tenant_id=1, year=2024)


def test_profit_analysis_endpoint_handles_db_error():
    """profit_analysis_endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_profit_analysis", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            profit_analysis_endpoint(tenant_id=1, year=2024, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Profit Analysis is temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


def test_profit_analysis_endpoint_handles_unexpected_error():
    """profit_analysis_endpoint converts generic Exception into HTTP 500."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_profit_analysis", side_effect=RuntimeError("Unexpected error")):
        with pytest.raises(HTTPException) as exc_info:
            profit_analysis_endpoint(tenant_id=1, year=2024, db=mock_db)

    assert exc_info.value.status_code == 500
    assert "An unexpected error occurred" in exc_info.value.detail
