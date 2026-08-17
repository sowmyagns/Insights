"""Tests for database exception handling and rollback during allocation summary retrieval.

Covers:
- get_allocation_summary() service rollback on DB error (OperationalError -> 503)
- get_allocation_summary() service rollback on generic exception (RuntimeError -> 500)
- GET /api/production/allocation/summary endpoint DB error handling (503)
- GET /api/production/allocation/summary endpoint generic error handling (500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.allocation_service import get_allocation_summary


def test_get_allocation_summary_service_rolls_back_on_db_error():
    """Simulate a DB query failure during get_allocation_summary and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError(
        "SELECT machines", {}, Exception("Database connection lost during allocation summary query")
    )

    try:
        get_allocation_summary(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_get_allocation_summary_service_rolls_back_on_generic_exception():
    """Simulate an unexpected error during get_allocation_summary and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected summary error")

    try:
        get_allocation_summary(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to retrieve allocation summary" in exc.detail
        mock_db.rollback.assert_called_once()


def test_allocation_summary_endpoint_handles_db_error(client, register_admin):
    """GET /api/production/allocation/summary with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.get_allocation_summary",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/api/production/allocation/summary",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "Database connection unavailable" in str(data)


def test_allocation_summary_endpoint_handles_generic_exception(client, register_admin):
    """GET /api/production/allocation/summary with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.routers.production_api.get_allocation_summary",
        side_effect=RuntimeError("Unexpected allocation summary crash"),
    ):
        resp = client.get(
            "/api/production/allocation/summary",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "Failed to retrieve allocation summary" in str(data)
