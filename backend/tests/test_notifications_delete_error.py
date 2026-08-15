"""Tests for generic exception handling on notification delete endpoints: DELETE /clear & DELETE /{notification_id}."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.services.notification_management_service import NotificationManagementService


def test_clear_notifications_endpoint_success(client, register_admin):
    admin_auth = register_admin()

    resp = client.delete("/api/notifications/clear", headers=admin_auth["headers"])
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["message"] == "All notifications cleared"


def test_clear_notifications_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "clear_all",
        side_effect=OperationalError("DELETE FROM erp_notifications", {}, Exception("Database lock")),
    ):
        resp = client.delete("/api/notifications/clear", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database error clearing notifications"
    assert "errors" in data


def test_clear_notifications_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "clear_all",
        side_effect=RuntimeError("Internal system crash"),
    ):
        resp = client.delete("/api/notifications/clear", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Failed to clear notifications"
    assert "errors" in data


def test_delete_notification_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "delete_notification",
        side_effect=OperationalError("DELETE", {}, Exception("Constraint error")),
    ):
        resp = client.delete("/api/notifications/1", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database error deleting notification"
    assert "errors" in data


def test_delete_notification_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "delete_notification",
        side_effect=RuntimeError("Driver execution failure"),
    ):
        resp = client.delete("/api/notifications/1", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Failed to delete notification"
    assert "errors" in data
