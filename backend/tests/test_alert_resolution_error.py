"""Tests for transaction rollback and exception handling during alert resolution.

Covers:
- resolve_alert() service rollback on DB commit failure (OperationalError -> 503)
- resolve_alert() service rollback on generic exception (RuntimeError -> 500)
- PUT /alerts/{id}/resolve endpoint error handling (503 and 500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.models.alert import Alert
from app.services.alert_service import resolve_alert


def test_resolve_alert_service_rolls_back_on_commit_failure():
    """Simulate a database commit failure during resolve_alert and verify rollback."""
    mock_db = MagicMock()
    mock_alert = Alert(id=1, tenant_id=1, status="active")
    mock_db.get.return_value = mock_alert
    mock_db.commit.side_effect = OperationalError(
        "UPDATE alerts", {}, Exception("DB connection lost during resolve commit")
    )

    try:
        resolve_alert(mock_db, alert_id=1, tenant_id=1, resolved_by="User B")
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_resolve_alert_service_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during resolve_alert and verify rollback."""
    mock_db = MagicMock()
    mock_db.get.side_effect = RuntimeError("Unexpected query error")

    try:
        resolve_alert(mock_db, alert_id=1, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to resolve alert" in exc.detail
        mock_db.rollback.assert_called_once()


def test_resolve_alert_endpoint_put_handles_db_error(client, register_admin):
    """PUT /alerts/{id}/resolve with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.resolve_alert",
        side_effect=OperationalError("UPDATE", {}, Exception("Database offline")),
    ):
        resp = client.put(
            "/alerts/1/resolve",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_resolve_alert_endpoint_put_handles_generic_exception(client, register_admin):
    """PUT /alerts/{id}/resolve with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.resolve_alert",
        side_effect=RuntimeError("Unexpected resolution crash"),
    ):
        resp = client.put(
            "/alerts/1/resolve",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to resolve alert" in data["detail"]
