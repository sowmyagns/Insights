"""Tests for generic exception handling on POST /auth/login."""

import pytest
from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_login_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()
    email = admin_auth["email"]

    with patch("app.api.auth.find_user_by_email", side_effect=OperationalError("SELECT 1", {}, Exception("Database connection failure"))):
        resp = client.post(
            "/auth/login",
            json={"email": email, "password": "Passw0rd!123", "role": "Admin"},
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "Database connection or transaction failure during login" in data["detail"]


def test_login_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()
    email = admin_auth["email"]

    with patch("app.api.auth.find_user_by_email", side_effect=RuntimeError("Unexpected driver crash")):
        resp = client.post(
            "/auth/login",
            json={"email": email, "password": "Passw0rd!123", "role": "Admin"},
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "An internal error occurred during login" in data["detail"]


def test_operator_api_login_handles_sqlalchemy_error(client, register_admin):
    """Operator API login handles database disconnect / SQLAlchemyError gracefully with controlled 500 response."""
    admin_auth = register_admin()
    email = admin_auth["email"]

    with patch("app.services.auth_service.find_user_by_email", side_effect=OperationalError("SELECT 1", {}, Exception("DB disconnect"))):
        resp = client.post(
            "/api/auth/login",
            json={"email": email, "password": "Passw0rd!123", "role": "Admin"},
        )

    assert resp.status_code == 500
    data = resp.json()
    msg = data.get("detail") or data.get("message") or ""
    assert "Database connection or transaction failure during login" in msg


def test_record_login_attempt_handles_db_error():
    """record_login_attempt catches SQLAlchemyError, executes db.rollback(), and re-raises."""
    from unittest.mock import MagicMock
    from sqlalchemy.exc import SQLAlchemyError
    from app.services.security_service import record_login_attempt

    mock_db = MagicMock()
    mock_db.commit.side_effect = SQLAlchemyError("DB failure during attempt log")

    with pytest.raises(SQLAlchemyError):
        record_login_attempt(mock_db, email="test@example.com", success=True)

    mock_db.rollback.assert_called_once()


def test_record_login_history_handles_db_error():
    """record_login_history catches SQLAlchemyError, executes db.rollback(), and re-raises."""
    from unittest.mock import MagicMock
    from sqlalchemy.exc import SQLAlchemyError
    from app.services.login_history_service import record_login_history

    mock_db = MagicMock()
    mock_db.commit.side_effect = SQLAlchemyError("DB failure during history log")

    with pytest.raises(SQLAlchemyError):
        record_login_history(mock_db, email="test@example.com", success=True)

    mock_db.rollback.assert_called_once()

