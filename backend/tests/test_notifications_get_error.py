"""Tests for graceful exception handling on notification retrieval endpoints: GET /notifications & GET /unread-count."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.services.notification_management_service import NotificationManagementService


def test_list_notifications_endpoint_success(client, register_admin):
    admin_auth = register_admin()

    resp = client.get("/api/notifications", headers=admin_auth["headers"])
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["message"] == "Notifications retrieved"


def test_list_notifications_endpoint_handles_database_unavailable(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "list_notifications",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database connection lost")),
    ):
        resp = client.get("/api/notifications", headers=admin_auth["headers"])

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database connection unavailable"
    assert "errors" in data


def test_list_notifications_endpoint_handles_generic_service_failure(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "list_notifications",
        side_effect=RuntimeError("Unexpected query failure"),
    ):
        resp = client.get("/api/notifications", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Failed to list notifications"
    assert "errors" in data


def test_unread_count_endpoint_handles_database_unavailable(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "unread_count",
        side_effect=OperationalError("SELECT count", {}, Exception("Connection refused")),
    ):
        resp = client.get("/api/notifications/unread-count", headers=admin_auth["headers"])

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database connection unavailable"
    assert "errors" in data


def test_unread_count_endpoint_handles_generic_service_failure(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        NotificationManagementService,
        "unread_count",
        side_effect=RuntimeError("Internal count failure"),
    ):
        resp = client.get("/api/notifications/unread-count", headers=admin_auth["headers"])

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Failed to retrieve unread count"
    assert "errors" in data
