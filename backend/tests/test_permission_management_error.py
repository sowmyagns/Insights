"""Tests for exception handling on PUT /api/settings/permissions/{role_id}."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_update_permissions_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.update_role", side_effect=OperationalError("UPDATE", {}, Exception("Database offline"))):
        resp = client.put(
            "/api/settings/permissions/1",
            json={"permissions": ["production"]},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error updating role permissions" in data["message"]
    assert "errors" in data


def test_update_permissions_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.update_role", side_effect=RuntimeError("Internal system crash")):
        resp = client.put(
            "/api/settings/permissions/1",
            json={"permissions": ["production"]},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to update role permissions" in data["message"]
    assert "errors" in data
