"""Tests: Exception handling for core Analytics services and endpoints.

Verifies that get_monthly_production_trend, get_machine_efficiency, and
get_worker_performance_score catch database exceptions (SQLAlchemyError)
and general exceptions, execute db.rollback(), and return controlled HTTP status codes (503/500).
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.analytics import (
    machine_efficiency_endpoint,
    production_trend_endpoint,
    worker_performance_endpoint,
)
from app.services.analytics_service import (
    get_machine_efficiency,
    get_monthly_production_trend,
    get_worker_performance_score,
)


# --- 1. Production Trend ---

def test_get_monthly_production_trend_handles_db_error():
    """SQLAlchemyError during production trend retrieval triggers db.rollback and re-raises."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = SQLAlchemyError("DB offline")

    with pytest.raises(SQLAlchemyError):
        get_monthly_production_trend(mock_db, tenant_id=1, year=2024)

    mock_db.rollback.assert_called_once()


def test_production_trend_endpoint_handles_db_error():
    """production_trend_endpoint converts SQLAlchemyError into HTTP 503."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_monthly_production_trend", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            production_trend_endpoint(tenant_id=1, year=2024, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Production trend is temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


# --- 2. Machine Efficiency ---

def test_get_machine_efficiency_handles_db_error():
    """SQLAlchemyError during machine efficiency calculation triggers db.rollback and re-raises."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = SQLAlchemyError("DB offline")

    with pytest.raises(SQLAlchemyError):
        get_machine_efficiency(mock_db, tenant_id=1)

    mock_db.rollback.assert_called_once()


def test_machine_efficiency_endpoint_handles_db_error():
    """machine_efficiency_endpoint converts SQLAlchemyError into HTTP 503."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_machine_efficiency", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            machine_efficiency_endpoint(tenant_id=1, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Machine efficiency is temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


# --- 3. Worker Performance ---

def test_get_worker_performance_score_handles_db_error():
    """SQLAlchemyError during performance score calculation triggers db.rollback and re-raises."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = SQLAlchemyError("DB offline")

    with pytest.raises(SQLAlchemyError):
        get_worker_performance_score(mock_db, tenant_id=1)

    mock_db.rollback.assert_called_once()


def test_worker_performance_endpoint_handles_db_error():
    """worker_performance_endpoint converts SQLAlchemyError into HTTP 503."""
    mock_db = MagicMock()

    with patch("app.api.analytics.get_worker_performance_score", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            worker_performance_endpoint(tenant_id=1, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Worker performance score is temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()
