"""Tests for exception handling on GET /settings/account-overview when DB is unavailable."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_account_overview_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.settings.get_account_overview",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/settings/account-overview",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_account_overview_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.settings.get_account_overview",
        side_effect=RuntimeError("Service crash"),
    ):
        resp = client.get(
            "/settings/account-overview",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to load account overview" in data["detail"]
