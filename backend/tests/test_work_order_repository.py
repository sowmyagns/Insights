"""Unit tests for WorkOrderRepository exception handling, rollback, and query operations."""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import InvalidRequestError, OperationalError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.production import WorkOrder
from app.repositories.work_order_repository import WorkOrderRepository


def test_work_order_repository_save_success():
    mock_db = MagicMock()
    repo = WorkOrderRepository(mock_db, tenant_id=1)
    mock_wo = MagicMock(spec=WorkOrder)

    result = repo.save(mock_wo)

    mock_db.add.assert_called_once_with(mock_wo)
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(mock_wo)
    assert result == mock_wo


def test_work_order_repository_save_catches_sqlalchemy_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("Database connection lost / constraint violation"))

    repo = WorkOrderRepository(mock_db, tenant_id=1)
    mock_wo = MagicMock(spec=WorkOrder)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_wo)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "Transaction has been rolled back" in exc_info.value.detail


def test_work_order_repository_save_catches_unexpected_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = RuntimeError("Fatal DB driver error")

    repo = WorkOrderRepository(mock_db, tenant_id=1)
    mock_wo = MagicMock(spec=WorkOrder)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_wo)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "Transaction has been rolled back" in exc_info.value.detail


def test_work_order_repository_list_all_success():
    mock_db = MagicMock()
    mock_wo = MagicMock(spec=WorkOrder)
    mock_db.scalars.return_value.all.return_value = [mock_wo]

    repo = WorkOrderRepository(mock_db, tenant_id=1)
    result = repo.list_all()

    assert result == [mock_wo]
    mock_db.scalars.assert_called_once()


def test_work_order_repository_list_all_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_work_order_repository_list_all_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query crash")

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


def test_work_order_repository_get_by_id_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Timeout"))

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(10)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_work_order_repository_refresh_catches_invalid_request_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = InvalidRequestError("Instance is not persistent within this Session")

    repo = WorkOrderRepository(mock_db, tenant_id=1)
    mock_wo = MagicMock(spec=WorkOrder)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_wo)

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_work_order_repository_refresh_catches_unmapped_instance_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = UnmappedInstanceError("Class is not mapped")

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh("invalid_obj")

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_work_order_repository_list_today_invalid_planned_start_handled_gracefully():
    mock_db = MagicMock()
    wo_invalid_date = MagicMock(spec=WorkOrder)
    wo_invalid_date.planned_start = "not-a-valid-date"
    wo_invalid_date.status = "planned"

    wo_running = MagicMock(spec=WorkOrder)
    wo_running.planned_start = "invalid-format"
    wo_running.status = "in_progress"

    mock_db.scalars.return_value.all.return_value = [wo_invalid_date, wo_running]

    repo = WorkOrderRepository(mock_db, tenant_id=1)
    result = repo.list_today()

    # wo_running should be included because status is in_progress, wo_invalid_date excluded safely without raising exception
    assert result == [wo_running]


def test_work_order_repository_list_today_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Database connection failure"))

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_today()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_work_order_repository_list_assigned_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Database connection lost"))
    mock_user = MagicMock()
    mock_user.id = 5
    mock_user.assigned_machine_id = None

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_assigned(mock_user)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_work_order_repository_list_pending_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Database offline"))

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_pending()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_work_order_repository_get_by_number_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection timeout"))

    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_number("WO-001")

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


@pytest.mark.parametrize("invalid_id", [None, "10", True, False, 0, -5])
def test_work_order_repository_get_by_id_invalid_input(invalid_id):
    mock_db = MagicMock()
    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(invalid_id)

    assert exc_info.value.status_code == 400
    assert "Invalid work order ID" in exc_info.value.detail


@pytest.mark.parametrize("invalid_number", [None, "", "   ", 12345])
def test_work_order_repository_get_by_number_invalid_input(invalid_number):
    mock_db = MagicMock()
    repo = WorkOrderRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_number(invalid_number)

    assert exc_info.value.status_code == 400
    assert "Invalid work order number" in exc_info.value.detail


