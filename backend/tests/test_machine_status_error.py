"""Tests for generic exception handling and controlled error responses on PATCH /machines/{id}/status."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError, SQLAlchemyError


def test_update_machine_status_endpoint_success(client, register_admin):
    admin_auth = register_admin()
    
    # Create a machine first
    create_resp = client.post(
        "/api/masters/machines/simple",
        json={"tenant_id": 1, "name": "Test Press Machine", "code": "PRESS-01", "status": "running"},
        headers=admin_auth["headers"],
    )
    assert create_resp.status_code in (200, 201), create_resp.text
    machine_id = create_resp.json()["data"]["id"]

    # Update status to idle with idle_reason
    status_resp = client.patch(
        f"/api/masters/machines/{machine_id}/status",
        json={"status": "idle", "idle_reason": "Maintenance required"},
        headers=admin_auth["headers"],
    )
    assert status_resp.status_code == 200, status_resp.text
    data = status_resp.json()
    assert data["success"] is True
    assert data["message"] == "Machine status updated"
    assert data["data"] is not None


def test_update_machine_status_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    # Simulate a database failure during update_machine_status before notification execution
    with patch(
        "app.routers.masters_api.update_machine_status",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database connection failure")),
    ):
        status_resp = client.patch(
            "/api/masters/machines/1/status",
            json={"status": "idle", "idle_reason": "Tooling issue"},
            headers=admin_auth["headers"],
        )

    # API must return controlled error response instead of unhandled 500 internal server error
    assert status_resp.status_code == 500
    data = status_resp.json()
    assert data["success"] is False
    assert "Database error updating machine status" in data["message"]
    assert "errors" in data


def test_update_machine_status_endpoint_handles_generic_service_failure(client, register_admin):
    admin_auth = register_admin()

    # Simulate a generic service/database failure before notification execution
    with patch(
        "app.routers.masters_api.update_machine_status",
        side_effect=RuntimeError("Unexpected database connection crash"),
    ):
        status_resp = client.patch(
            "/api/masters/machines/1/status",
            json={"status": "stopped", "idle_reason": "Sensor fault"},
            headers=admin_auth["headers"],
        )

    # API must return controlled error response with status 500 and errors field
    assert status_resp.status_code == 500
    data = status_resp.json()
    assert data["success"] is False
    assert "Failed to update machine status" in data["message"]
    assert "errors" in data
