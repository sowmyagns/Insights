"""Unit tests for AuthRepository exception handling."""

from unittest.mock import MagicMock, call
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import InvalidRequestError, OperationalError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.repositories.auth_repository import AuthRepository


def test_auth_repository_catches_db_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_user_by_email("test@example.com")

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_auth_repository_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = Exception("Unexpected DB failure")

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_user_by_id(1)

    assert exc_info.value.status_code == 500
    assert "Database operation failed." in exc_info.value.detail


def test_commit_rolls_back_on_sqlalchemy_error():
    """commit() must call rollback() when a SQLAlchemyError occurs."""
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("disk full"))

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.commit()

    # rollback must have been called
    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "rolled back" in exc_info.value.detail


def test_commit_rolls_back_on_unexpected_error():
    """commit() must call rollback() even for non-SQLAlchemy exceptions."""
    mock_db = MagicMock()
    mock_db.commit.side_effect = RuntimeError("unexpected engine crash")

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.commit()

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "rolled back" in exc_info.value.detail


def test_commit_no_rollback_on_success():
    """commit() must NOT call rollback() when commit succeeds."""
    mock_db = MagicMock()
    repo = AuthRepository(mock_db)

    repo.commit()  # should not raise

    mock_db.commit.assert_called_once()
    mock_db.rollback.assert_not_called()


# ---------------------------------------------------------------------------
# create_password_reset_token() rollback tests
# ---------------------------------------------------------------------------

from datetime import datetime, timezone, timedelta


def _future_expiry():
    return datetime.now(timezone.utc) + timedelta(hours=1)


def test_create_reset_token_rolls_back_on_flush_sqlalchemy_error():
    """flush() failure during token creation must trigger rollback and HTTP 503."""
    mock_db = MagicMock()
    # execute() for invalidate_active_reset_tokens succeeds; flush() fails
    mock_db.flush.side_effect = OperationalError("INSERT", {}, Exception("disk full"))

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.create_password_reset_token(user_id=1, expires_at=_future_expiry())

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "rolled back" in exc_info.value.detail


def test_create_reset_token_rolls_back_on_unexpected_error():
    """A generic exception during flush must trigger rollback and HTTP 500."""
    mock_db = MagicMock()
    mock_db.flush.side_effect = RuntimeError("unexpected engine error")

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.create_password_reset_token(user_id=2, expires_at=_future_expiry())

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "rolled back" in exc_info.value.detail


def test_create_reset_token_succeeds_without_rollback():
    """Successful token creation must NOT call rollback()."""
    mock_db = MagicMock()
    repo = AuthRepository(mock_db)

    token = repo.create_password_reset_token(user_id=3, expires_at=_future_expiry())

    assert isinstance(token, str) and len(token) > 0
    mock_db.add.assert_called_once()
    mock_db.flush.assert_called_once()
    mock_db.rollback.assert_not_called()


# ---------------------------------------------------------------------------
# update_user_password() rollback tests
# ---------------------------------------------------------------------------

def test_update_user_password_rolls_back_on_flush_sqlalchemy_error():
    """flush() failure during password update must trigger rollback and HTTP 503."""
    mock_db = MagicMock()
    mock_db.flush.side_effect = OperationalError("UPDATE", {}, Exception("deadlock detected"))

    repo = AuthRepository(mock_db)
    mock_user = MagicMock(id=1, hashed_password="old_hash", failed_login_attempts=2, locked_until=None)

    with pytest.raises(HTTPException) as exc_info:
        repo.update_user_password(mock_user, "new_hashed_password")

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "rolled back" in exc_info.value.detail


def test_update_user_password_rolls_back_on_unexpected_error():
    """A generic exception during flush in update_user_password must trigger rollback and HTTP 500."""
    mock_db = MagicMock()
    mock_db.flush.side_effect = RuntimeError("unexpected connection break")

    repo = AuthRepository(mock_db)
    mock_user = MagicMock(id=1, hashed_password="old_hash", failed_login_attempts=0, locked_until=None)

    with pytest.raises(HTTPException) as exc_info:
        repo.update_user_password(mock_user, "new_hashed_password")

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 500
    assert "rolled back" in exc_info.value.detail


def test_update_user_password_succeeds_without_rollback():
    """Successful password update must NOT call rollback()."""
    mock_db = MagicMock()
    repo = AuthRepository(mock_db)
    mock_user = MagicMock(id=1, hashed_password="old_hash", failed_login_attempts=3, locked_until="2026-01-01")

    repo.update_user_password(mock_user, "new_hashed_password")

    assert mock_user.hashed_password == "new_hashed_password"
    assert mock_user.failed_login_attempts == 0
    assert mock_user.locked_until is None
    mock_db.flush.assert_called_once()
    mock_db.rollback.assert_not_called()


# ---------------------------------------------------------------------------
# refresh() error handling tests
# ---------------------------------------------------------------------------

def test_refresh_succeeds():
    mock_db = MagicMock()
    repo = AuthRepository(mock_db)
    mock_user = MagicMock()

    repo.refresh(mock_user)
    mock_db.refresh.assert_called_once_with(mock_user)


def test_refresh_with_attribute_names():
    mock_db = MagicMock()
    repo = AuthRepository(mock_db)
    mock_user = MagicMock()

    repo.refresh(mock_user, attribute_names=["roles"])
    mock_db.refresh.assert_called_once_with(mock_user, attribute_names=["roles"])


def test_refresh_catches_invalid_request_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = InvalidRequestError("Instance is not persistent within this Session")

    repo = AuthRepository(mock_db)
    mock_user = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_user)

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_refresh_catches_unmapped_instance_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = UnmappedInstanceError("Class is not mapped")

    repo = AuthRepository(mock_db)

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh("invalid_string_obj")

    assert exc_info.value.status_code == 400
    assert "invalid or detached object" in exc_info.value.detail


def test_refresh_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = OperationalError("SELECT 1", {}, Exception("Connection lost"))

    repo = AuthRepository(mock_db)
    mock_user = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_user)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_refresh_catches_unexpected_error():
    mock_db = MagicMock()
    mock_db.refresh.side_effect = RuntimeError("Unexpected internal failure")

    repo = AuthRepository(mock_db)
    mock_user = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        repo.refresh(mock_user)

    assert exc_info.value.status_code == 500
    assert "Failed to refresh object." in exc_info.value.detail

