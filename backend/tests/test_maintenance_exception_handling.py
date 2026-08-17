"""Regression tests for maintenance API exception handling."""

from unittest.mock import patch

from sqlalchemy.exc import OperationalError


def test_create_preventive_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.maintenance.create_preventive_maintenance",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database connection failure")),
    ):
        response = client.post(
            "/maintenance/preventive",
            json={
                "tenant_id": 1,
                "machine_id": 1,
                "schedule_date": "2026-08-17",
                "task_description": "Quarterly inspection",
                "frequency": "monthly",
                "status": "scheduled",
            },
            headers=admin_auth["headers"],
        )

    assert response.status_code == 503, response.text
    assert response.json()["detail"] == "Database service unavailable"


def test_create_breakdown_endpoint_handles_value_error(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.maintenance.create_breakdown_report",
        side_effect=ValueError("Machine ID is required"),
    ):
        response = client.post(
            "/maintenance/breakdowns",
            json={
                "tenant_id": 1,
                "machine_id": 1,
                "reported_at": "2026-08-17T10:00:00",
                "description": "Unexpected shutdown",
                "downtime_minutes": 45,
                "status": "reported",
            },
            headers=admin_auth["headers"],
        )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Machine ID is required"


def test_update_breakdown_status_endpoint_handles_generic_service_failure(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.maintenance.update_breakdown_status",
        side_effect=RuntimeError("Unexpected processing crash"),
    ):
        response = client.patch(
            "/maintenance/breakdowns/1/status?status=in_progress",
            headers=admin_auth["headers"],
        )

    assert response.status_code == 500, response.text
    assert response.json()["detail"] == "Failed to update breakdown status"
