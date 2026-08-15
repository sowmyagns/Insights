"""Unit tests for NotificationRepository exception handling and query operations."""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import InvalidRequestError, OperationalError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.erp_notification import ErpNotification
from app.repositories.notification_repository import NotificationRepository


def test_notification_repository_list_paginated_success():
    mock_db = MagicMock()
    mock_notif = MagicMock(spec=ErpNotification)
    mock_db.scalars.return_value.all.return_value = [mock_notif]
    mock_db.scalar.return_value = 1

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)
    rows, total = repo.list_paginated()

    assert rows == [mock_notif]
    assert total == 1


def test_notification_repository_list_paginated_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalar.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_paginated()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_notification_repository_count_unread_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalar.side_effect = OperationalError("SELECT 1", {}, Exception("Query error"))

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)

    with pytest.raises(HTTPException) as exc_info:
        repo.count_unread()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_notification_repository_create_catches_sqlalchemy_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("Duplicate key"))

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)

    with pytest.raises(HTTPException) as exc_info:
        repo.create(message="New notification")

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "Database commit failed. Transaction has been rolled back." in exc_info.value.detail


def test_notification_repository_create_catches_unexpected_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = RuntimeError("Fatal DB driver failure")

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)

    with pytest.raises(HTTPException) as exc_info:
        repo.create(message="New notification")

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "Database commit failed. Transaction has been rolled back." in exc_info.value.detail


def test_notification_repository_refresh_catches_invalid_request_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = InvalidRequestError("Detached object")

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)
    mock_notif = MagicMock(spec=ErpNotification)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_notif)

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_notification_repository_mark_read_catches_sqlalchemy_error_and_rolls_back():
    mock_db = MagicMock()
    mock_notif = MagicMock(spec=ErpNotification, is_read=False)
    mock_db.scalar.return_value = mock_notif
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("Connection dead"))

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)

    with pytest.raises(HTTPException) as exc_info:
        repo.mark_read(10)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "Database commit failed. Transaction has been rolled back." in exc_info.value.detail


def test_notification_repository_mark_read_catches_unexpected_error_and_rolls_back():
    mock_db = MagicMock()
    mock_notif = MagicMock(spec=ErpNotification, is_read=False)
    mock_db.scalar.return_value = mock_notif
    mock_db.commit.side_effect = RuntimeError("Fatal DB driver failure")

    repo = NotificationRepository(mock_db, tenant_id=1, user_id=2)

    with pytest.raises(HTTPException) as exc_info:
        repo.mark_read(10)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "Database commit failed. Transaction has been rolled back." in exc_info.value.detail

