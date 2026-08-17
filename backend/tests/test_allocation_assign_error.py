"""Tests for transaction rollback and exception handling during work order machine allocation assignment.

Covers:
- assign_allocation() service rollback on DB commit failure (OperationalError -> 503)
- assign_allocation() service rollback on generic exception (RuntimeError -> 500)
- POST /production/allocation/assign endpoint DB error handling (503)
- POST /production/allocation/assign endpoint generic error handling (500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.models.machine import Machine
from app.models.production import WorkOrder
from app.schemas.allocation import AllocationAssignRequest
from app.services.allocation_service import assign_allocation


def test_assign_allocation_service_rolls_back_on_commit_failure():
    """Simulate a database commit failure during assign_allocation and verify rollback."""
    mock_db = MagicMock()
    mock_wo = WorkOrder(id=10, tenant_id=1, status="released")
    mock_machine = Machine(id=5, tenant_id=1, status="available", name="CNC-01")

    mock_db.scalars.return_value.first.side_effect = [mock_wo, mock_machine]
    mock_db.commit.side_effect = OperationalError(
        "UPDATE work_orders", {}, Exception("DB connection lost during allocation commit")
    )

    payload = AllocationAssignRequest(
        work_order_id=10,
        machine_id=5,
        operator_name="Operator X",
        shift="Shift A",
    )

    try:
        assign_allocation(mock_db, tenant_id=1, payload=payload)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_assign_allocation_service_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during assign_allocation and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query error")

    payload = AllocationAssignRequest(
        work_order_id=10,
        machine_id=5,
    )

    try:
        assign_allocation(mock_db, tenant_id=1, payload=payload)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to assign work order allocation" in exc.detail
        mock_db.rollback.assert_called_once()


def test_assign_machine_endpoint_handles_db_error(client, register_admin):
    """POST /api/production/allocation/assign with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.assign_allocation",
        side_effect=OperationalError("UPDATE", {}, Exception("Database offline")),
    ):
        resp = client.post(
            "/api/production/allocation/assign",
            json={
                "work_order_id": 10,
                "machine_id": 5,
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "Database connection unavailable" in str(data)


def test_assign_machine_endpoint_handles_generic_exception(client, register_admin):
    """POST /api/production/allocation/assign with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.assign_allocation",
        side_effect=RuntimeError("Unexpected allocation crash"),
    ):
        resp = client.post(
            "/api/production/allocation/assign",
            json={
                "work_order_id": 10,
                "machine_id": 5,
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "Failed to assign work order allocation" in str(data)
