"""Tests for exception handling on user and role management endpoints in admin.py & rbac_service.py."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_create_user_handles_database_error(client, register_admin):
    admin_auth = register_admin()
    domain = admin_auth["email"].split("@", 1)[1]
    email = f"test-user-err@{domain}"

    with patch("app.services.rbac_service.create_user", side_effect=OperationalError("INSERT", {}, Exception("Database lock"))):
        resp = client.post(
            "/admin/users",
            json={
                "email": email,
                "full_name": "Test User Error",
                "password": "Passw0rd!123",
                "role_ids": [1],
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Database error creating user" in data["detail"]


def test_update_user_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.update_user", side_effect=OperationalError("UPDATE", {}, Exception("DB disconnect"))):
        resp = client.put(
            "/admin/users/2",
            json={"full_name": "Updated Name"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Database error updating user" in data["detail"]


def test_delete_user_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.delete_user", side_effect=OperationalError("DELETE", {}, Exception("DB offline"))):
        resp = client.delete(
            "/admin/users/2",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Database error deleting user" in data["detail"]


def test_create_role_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.create_role", side_effect=OperationalError("INSERT", {}, Exception("Database failure"))):
        resp = client.post(
            "/admin/roles",
            json={
                "name": "Custom Role Test",
                "description": "Test role",
                "permissions": ["production"],
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Database error creating role" in data["detail"]


def test_update_role_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.update_role", side_effect=RuntimeError("Role update crash")):
        resp = client.put(
            "/admin/roles/2",
            json={"description": "New description"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to update role" in data["detail"]


def test_delete_role_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.rbac_service.delete_role", side_effect=OperationalError("DELETE", {}, Exception("DB failure"))):
        resp = client.delete(
            "/admin/roles/2",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Database error deleting role" in data["detail"]
