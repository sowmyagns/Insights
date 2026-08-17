"""Tests for database exception handling and rollback during allocation list retrieval.

Covers:
- get_allocation_list() service rollback on DB query failure (OperationalError -> 503)
- get_allocation_list() service rollback on generic exception (RuntimeError -> 500)
- GET /api/production/allocation/rows endpoint DB error handling (503)
- GET /api/production/allocation/rows endpoint generic error handling (500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.allocation_service import get_allocation_list


def test_get_allocation_list_service_rolls_back_on_db_error():
    """Simulate a DB query failure during get_allocation_list and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError(
        "SELECT work_orders", {}, Exception("Database connection lost during allocation list query")
    )

    try:
        get_allocation_list(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_get_allocation_list_service_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during get_allocation_list and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected allocation list error")

    try:
        get_allocation_list(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to retrieve allocation list" in exc.detail
        mock_db.rollback.assert_called_once()


def test_allocation_rows_endpoint_handles_db_error(client, register_admin):
    """GET /api/production/allocation/rows with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.get_allocation_list",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/api/production/allocation/rows",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "Database connection unavailable" in str(data)


def test_allocation_rows_endpoint_handles_generic_exception(client, register_admin):
    """GET /api/production/allocation/rows with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.get_allocation_list",
        side_effect=RuntimeError("Unexpected allocation rows crash"),
    ):
        resp = client.get(
            "/api/production/allocation/rows",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "Failed to retrieve allocation rows" in str(data)
