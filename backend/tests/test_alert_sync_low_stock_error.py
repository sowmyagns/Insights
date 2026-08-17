"""Tests for transaction rollback and exception handling during low stock alert synchronization.

Covers:
- sync_low_stock_alerts() service rollback on DB commit failure (OperationalError -> 503)
- sync_low_stock_alerts() service rollback on generic exception (RuntimeError -> 500)
- POST /alerts/sync-low-stock endpoint error handling (503 and 500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.alert_service import sync_low_stock_alerts


def test_sync_low_stock_alerts_service_rolls_back_on_commit_failure():
    """Simulate a database commit failure during sync_low_stock_alerts and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.return_value.all.return_value = []
    mock_db.commit.side_effect = OperationalError(
        "COMMIT", {}, Exception("DB connection lost during low stock sync commit")
    )

    with patch(
        "app.services.alert_service.get_inventory_dashboard",
        return_value=[
            {
                "id": 1,
                "name": "Steel Sheet",
                "sku": "ST-01",
                "needs_reorder": True,
                "total_quantity": 0,
                "reorder_level": 50,
            }
        ],
    ):
        try:
            sync_low_stock_alerts(mock_db, tenant_id=1)
            assert False, "Should have raised HTTPException"
        except HTTPException as exc:
            assert exc.status_code == 503
            assert "Database connection unavailable" in exc.detail
            mock_db.rollback.assert_called_once()


def test_sync_low_stock_alerts_service_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during sync_low_stock_alerts and verify rollback."""
    mock_db = MagicMock()

    with patch(
        "app.services.alert_service.get_inventory_dashboard",
        side_effect=RuntimeError("Dashboard calculation error"),
    ):
        try:
            sync_low_stock_alerts(mock_db, tenant_id=1)
            assert False, "Should have raised HTTPException"
        except HTTPException as exc:
            assert exc.status_code == 500
            assert "Failed to sync low stock alerts" in exc.detail
            mock_db.rollback.assert_called_once()


def test_sync_low_stock_endpoint_handles_db_error(client, register_admin):
    """POST /alerts/sync-low-stock with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.sync_low_stock_alerts",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.post(
            "/alerts/sync-low-stock",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_sync_low_stock_endpoint_handles_generic_exception(client, register_admin):
    """POST /alerts/sync-low-stock with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.sync_low_stock_alerts",
        side_effect=RuntimeError("Unexpected sync crash"),
    ):
        resp = client.post(
            "/alerts/sync-low-stock",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to sync low stock alerts" in data["detail"]
