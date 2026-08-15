"""Tests for generic exception handling on POST /auth/login."""

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
