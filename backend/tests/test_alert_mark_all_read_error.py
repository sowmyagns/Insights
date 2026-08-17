"""Tests for transaction rollback and exception handling during bulk mark-all-alerts-read operation.

Covers:
- mark_all_alerts_read() service rollback on DB commit failure (OperationalError -> 503)
- mark_all_alerts_read() service rollback on generic exception (RuntimeError -> 500)
- POST /alerts/mark-all-read endpoint error handling (503 and 500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.models.alert import Alert
from app.services.alert_service import mark_all_alerts_read


def test_mark_all_alerts_read_service_rolls_back_on_commit_failure():
    """Simulate a database commit failure during bulk mark-all-read and verify rollback."""
    mock_db = MagicMock()
    mock_alerts = [
        Alert(id=1, tenant_id=1, is_read=False),
        Alert(id=2, tenant_id=1, is_read=False),
    ]
    mock_db.scalars.return_value.all.return_value = mock_alerts
    mock_db.commit.side_effect = OperationalError(
        "UPDATE alerts", {}, Exception("DB connection lost during bulk mark read commit")
    )

    try:
        mark_all_alerts_read(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_mark_all_alerts_read_service_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during bulk mark-all-read and verify rollback."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query error")

    try:
        mark_all_alerts_read(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to mark all alerts as read" in exc.detail
        mock_db.rollback.assert_called_once()


def test_mark_all_alerts_read_endpoint_handles_db_error(client, register_admin):
    """POST /alerts/mark-all-read with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.mark_all_alerts_read",
        side_effect=OperationalError("UPDATE", {}, Exception("Database offline")),
    ):
        resp = client.post(
            "/alerts/mark-all-read",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_mark_all_alerts_read_endpoint_handles_generic_exception(client, register_admin):
    """POST /alerts/mark-all-read with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.mark_all_alerts_read",
        side_effect=RuntimeError("Unexpected bulk read crash"),
    ):
        resp = client.post(
            "/alerts/mark-all-read",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to mark all alerts as read" in data["detail"]
