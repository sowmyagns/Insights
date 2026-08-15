"""Unit tests for MachineRepository exception handling and query operations."""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import InvalidRequestError, OperationalError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.machine import Machine
from app.repositories.machine_repository import MachineRepository


def test_machine_repository_list_all_success():
    mock_db = MagicMock()
    mock_machine = MagicMock(spec=Machine)
    mock_db.scalars.return_value.all.return_value = [mock_machine]

    repo = MachineRepository(mock_db, tenant_id=1)
    result = repo.list_all()

    assert result == [mock_machine]
    mock_db.scalars.assert_called_once()


def test_machine_repository_list_all_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))

    repo = MachineRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_machine_repository_list_all_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query crash")

    repo = MachineRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


def test_machine_repository_get_by_id_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Timeout"))

    repo = MachineRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(10)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_machine_repository_get_by_code_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Lookup failed"))

    repo = MachineRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_code("MCH01")

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_machine_repository_list_by_status_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection lost"))

    repo = MachineRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_by_status("running")

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_machine_repository_save_catches_sqlalchemy_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("Constraint violation"))

    repo = MachineRepository(mock_db, tenant_id=1)
    mock_machine = MagicMock(spec=Machine)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_machine)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "Database commit failed. Transaction has been rolled back." in exc_info.value.detail


def test_machine_repository_save_catches_unexpected_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = RuntimeError("Fatal DB driver error")

    repo = MachineRepository(mock_db, tenant_id=1)
    mock_machine = MagicMock(spec=Machine)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_machine)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "Database commit failed. Transaction has been rolled back." in exc_info.value.detail


def test_machine_repository_refresh_catches_invalid_request_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = InvalidRequestError("Instance is not persistent within this Session")

    repo = MachineRepository(mock_db, tenant_id=1)
    mock_machine = MagicMock(spec=Machine)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_machine)

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_machine_repository_refresh_catches_unmapped_instance_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = UnmappedInstanceError("Class is not mapped")

    repo = MachineRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh("invalid_obj")

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_machine_repository_refresh_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = OperationalError("SELECT 1", {}, Exception("Connection lost"))

    repo = MachineRepository(mock_db, tenant_id=1)
    mock_machine = MagicMock(spec=Machine)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_machine)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_machine_repository_refresh_catches_unexpected_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = RuntimeError("Fatal hardware interrupt")

    repo = MachineRepository(mock_db, tenant_id=1)
    mock_machine = MagicMock(spec=Machine)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_machine)

    assert exc_info.value.status_code == 500
    assert "Failed to refresh object." in exc_info.value.detail

