"""Unit tests for BatchRepository exception handling and query operations."""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import InvalidRequestError, OperationalError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.production import Batch
from app.repositories.batch_repository import BatchRepository


def test_batch_repository_list_all_success():
    mock_db = MagicMock()
    mock_batch = MagicMock(spec=Batch)
    mock_db.scalars.return_value.all.return_value = [mock_batch]

    repo = BatchRepository(mock_db, tenant_id=1)
    result = repo.list_all()

    assert result == [mock_batch]
    mock_db.scalars.assert_called_once()


def test_batch_repository_list_all_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))

    repo = BatchRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_batch_repository_list_all_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query crash")

    repo = BatchRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


def test_batch_repository_get_by_id_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Timeout"))

    repo = BatchRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(10)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_batch_repository_list_by_status_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection lost"))

    repo = BatchRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_by_status("completed")

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_batch_repository_save_catches_sqlalchemy_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("Deadlock"))

    repo = BatchRepository(mock_db, tenant_id=1)
    mock_batch = MagicMock(spec=Batch)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_batch)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "Transaction has been rolled back" in exc_info.value.detail


def test_batch_repository_save_catches_unexpected_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = RuntimeError("Fatal DB driver error")

    repo = BatchRepository(mock_db, tenant_id=1)
    mock_batch = MagicMock(spec=Batch)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_batch)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "Transaction has been rolled back" in exc_info.value.detail


def test_batch_repository_refresh_catches_invalid_request_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = InvalidRequestError("Instance is not persistent within this Session")

    repo = BatchRepository(mock_db, tenant_id=1)
    mock_batch = MagicMock(spec=Batch)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_batch)

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_batch_repository_refresh_catches_unmapped_instance_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = UnmappedInstanceError("Class is not mapped")

    repo = BatchRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh("invalid_obj")

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail
