"""Unit tests for ProductionPlanRepository exception handling, invalid date handling, and query operations."""

from datetime import date, datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.models.production import ProductionOrder
from app.repositories.production_plan_repository import ProductionPlanRepository


def test_production_plan_repository_list_all_success():
    mock_db = MagicMock()
    mock_order = MagicMock(spec=ProductionOrder)
    mock_db.scalars.return_value.all.return_value = [mock_order]

    repo = ProductionPlanRepository(mock_db, tenant_id=1)
    result = repo.list_all()

    assert result == [mock_order]
    mock_db.scalars.assert_called_once()


def test_production_plan_repository_list_all_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Database down"))

    repo = ProductionPlanRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_production_plan_repository_list_all_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Fatal query error")

    repo = ProductionPlanRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


@pytest.mark.parametrize("invalid_id", [None, "10", True, False, 0, -1])
def test_production_plan_repository_get_by_id_invalid_input(invalid_id):
    mock_db = MagicMock()
    repo = ProductionPlanRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(invalid_id)

    assert exc_info.value.status_code == 400
    assert "Invalid plan ID" in exc_info.value.detail


def test_production_plan_repository_get_by_id_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Timeout"))

    repo = ProductionPlanRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(5)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_production_plan_repository_get_by_id_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Fatal driver crash")

    repo = ProductionPlanRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(5)

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


def test_production_plan_repository_list_today_with_valid_and_corrupted_start_dates():
    mock_db = MagicMock()

    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())

    order_today_dt = MagicMock(spec=ProductionOrder, start_date=today_dt, status="planned")
    order_today_date = MagicMock(spec=ProductionOrder, start_date=today, status="planned")
    order_today_str = MagicMock(spec=ProductionOrder, start_date=today.isoformat(), status="planned")

    order_corrupted_str = MagicMock(spec=ProductionOrder, start_date="corrupted-date-value", status="running")
    order_invalid_type = MagicMock(spec=ProductionOrder, start_date=12345, status="in_progress")
    order_invalid_none = MagicMock(spec=ProductionOrder, start_date=None, status="completed")

    mock_db.scalars.return_value.all.return_value = [
        order_today_dt,
        order_today_date,
        order_today_str,
        order_corrupted_str,
        order_invalid_type,
        order_invalid_none,
    ]

    repo = ProductionPlanRepository(mock_db, tenant_id=1)
    result = repo.list_today()

    assert order_today_dt in result
    assert order_today_date in result
    assert order_today_str in result
    assert order_corrupted_str in result  # fell back gracefully to status="running"
    assert order_invalid_type in result   # fell back gracefully to status="in_progress"
    assert order_invalid_none not in result


def test_production_plan_repository_list_today_catches_database_failure():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("DB query crashed"))

    repo = ProductionPlanRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_today()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail
