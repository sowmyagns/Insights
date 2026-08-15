"""Tests for generic exception handling on notification read update endpoints: PUT /read-all & PUT /{notification_id}/read."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.services.notification_management_service import NotificationManagementService


def test_mark_all_read_endpoint_success(client, register_admin):
    admin_auth = register_admin()

    resp = client.put("/api/notifications/read-all", headers=admin_auth["headers"])
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["message"] == "All notifications marked as read"


def test_mark_all_read_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "mark_all_read",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database offline")),
    ):
        resp = client.put("/api/notifications/read-all", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error marking all notifications as read" in data["message"]
    assert "errors" in data


def test_mark_all_read_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "mark_all_read",
        side_effect=RuntimeError("Service failure"),
    ):
        resp = client.put("/api/notifications/read-all", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to mark all notifications as read" in data["message"]
    assert "errors" in data


def test_mark_notification_read_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "mark_read",
        side_effect=OperationalError("UPDATE", {}, Exception("Connection dead")),
    ):
        resp = client.put("/api/notifications/1/read", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error marking notification as read" in data["message"]
    assert "errors" in data


def test_mark_notification_read_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "mark_read",
        side_effect=RuntimeError("Unexpected connection drop"),
    ):
        resp = client.put("/api/notifications/1/read", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to mark notification as read" in data["message"]
    assert "errors" in data
