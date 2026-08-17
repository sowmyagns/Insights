"""Tests for database exception handling and rollback during machine availability lookup.

Covers:
- get_machine_availability() service rollback on DB failure (OperationalError -> 503)
- get_machine_availability() service rollback on generic exception (RuntimeError -> 500)
- GET /api/production/allocation/machines endpoint DB error handling (503)
- GET /api/production/allocation/machines endpoint generic error handling (500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.allocation_service import get_machine_availability


def test_get_machine_availability_service_rolls_back_on_db_error():
    """Simulate a DB failure during get_machine_availability and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError(
        "SELECT machines", {}, Exception("Database connection lost during machine availability query")
    )

    try:
        get_machine_availability(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_get_machine_availability_service_rolls_back_on_generic_exception():
    """Simulate an unexpected error during get_machine_availability and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected machine availability error")

    try:
        get_machine_availability(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to retrieve machine availability" in exc.detail
        mock_db.rollback.assert_called_once()


def test_allocation_machines_endpoint_handles_db_error(client, register_admin):
    """GET /api/production/allocation/machines with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.get_machine_availability",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/api/production/allocation/machines",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "Database connection unavailable" in str(data)


def test_allocation_machines_endpoint_handles_generic_exception(client, register_admin):
    """GET /api/production/allocation/machines with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.get_machine_availability",
        side_effect=RuntimeError("Unexpected allocation machines crash"),
    ):
        resp = client.get(
            "/api/production/allocation/machines",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "Failed to retrieve allocation machines" in str(data) or "Failed to retrieve machine availability" in str(data)
