"""Tests for exception handling on work order operations: start, pause, resume, complete, progress."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.services.operator_service import OperatorService


def test_start_workorder_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "start_work_order",
        side_effect=OperationalError("UPDATE work_orders", {}, Exception("DB disconnect")),
    ):
        resp = client.post(
            "/api/workorders/start",
            json={"work_order_id": 1, "work_order_number": "WO-001"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error during work order start operation" in data["message"]
    assert "errors" in data


def test_pause_workorder_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "pause_work_order",
        side_effect=RuntimeError("Service unavailable"),
    ):
        resp = client.post(
            "/api/workorders/pause",
            json={"work_order_id": 1, "work_order_number": "WO-001"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to pause work order operation" in data["message"]
    assert "errors" in data


def test_resume_workorder_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "resume_work_order",
        side_effect=OperationalError("UPDATE", {}, Exception("Database lock")),
    ):
        resp = client.post(
            "/api/workorders/resume",
            json={"work_order_id": 1, "work_order_number": "WO-001"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error during work order resume operation" in data["message"]
    assert "errors" in data


def test_complete_workorder_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "complete_work_order",
        side_effect=RuntimeError("System crash"),
    ):
        resp = client.post(
            "/api/workorders/complete",
            json={"work_order_id": 1, "work_order_number": "WO-001"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to complete work order operation" in data["message"]
    assert "errors" in data


def test_update_progress_endpoint_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "update_production_progress",
        side_effect=OperationalError("UPDATE", {}, Exception("Connection dead")),
    ):
        resp = client.post(
            "/api/workorders/progress",
            json={"work_order_id": 1, "work_order_number": "WO-001", "produced_quantity": 50},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error during work order progress update" in data["message"]
    assert "errors" in data
