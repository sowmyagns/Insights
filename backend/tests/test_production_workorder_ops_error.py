"""Tests for exception handling on work order create, update, start, pause, stop, complete in production_api.py."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_create_work_order_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.production_service.create_work_order", side_effect=OperationalError("INSERT", {}, Exception("Database lock"))):
        resp = client.post(
            "/api/production/work-orders",
            json={"tenant_id": 1, "production_order_id": 1, "work_order_number": "WO-TEST-001", "planned_quantity": 100},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error creating work order" in data["message"]
    assert "errors" in data


def test_update_work_order_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.update_work_order", side_effect=RuntimeError("Unexpected error")):
        resp = client.patch(
            "/api/production/work-orders/1",
            json={"shift": "Night"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to update work order" in data["message"]
    assert "errors" in data


def test_start_work_order_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.start_work_order", side_effect=OperationalError("UPDATE", {}, Exception("DB disconnect"))):
        resp = client.post(
            "/api/production/work-orders/1/start",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error starting work order" in data["message"]
    assert "errors" in data


def test_pause_work_order_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.pause_work_order", side_effect=RuntimeError("Internal crash")):
        resp = client.post(
            "/api/production/work-orders/1/pause",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to pause work order" in data["message"]
    assert "errors" in data


def test_stop_work_order_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.stop_work_order", side_effect=OperationalError("UPDATE", {}, Exception("Connection dead"))):
        resp = client.post(
            "/api/production/work-orders/1/stop",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error stopping work order" in data["message"]
    assert "errors" in data


def test_complete_work_order_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.manufacturing_workflow_service.complete_work_order_integrated", side_effect=RuntimeError("System crash")):
        resp = client.post(
            "/api/production/work-orders/1/complete",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to complete work order" in data["message"]
    assert "errors" in data
