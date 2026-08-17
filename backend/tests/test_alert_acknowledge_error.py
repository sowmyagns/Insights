"""Tests for transaction rollback and exception handling during alert acknowledgement.

Covers:
- acknowledge_alert() service rollback on DB commit failure (OperationalError -> 503)
- acknowledge_alert() service rollback on generic exception (RuntimeError -> 500)
- POST /alerts/{id}/acknowledge endpoint error handling (503 and 500)
- PUT /alerts/{id}/acknowledge endpoint error handling (503 and 500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.models.alert import Alert
from app.services.alert_service import acknowledge_alert


def test_acknowledge_alert_service_rolls_back_on_commit_failure():
    """Simulate a database commit failure during acknowledge_alert and verify rollback."""
    mock_db = MagicMock()
    mock_alert = Alert(id=1, tenant_id=1, status="active")
    mock_db.get.return_value = mock_alert
    mock_db.commit.side_effect = OperationalError(
        "UPDATE alerts", {}, Exception("DB connection lost during acknowledge commit")
    )

    try:
        acknowledge_alert(mock_db, alert_id=1, tenant_id=1, acknowledged_by="User A")
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_acknowledge_alert_service_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during acknowledge_alert and verify rollback."""
    mock_db = MagicMock()
    mock_db.get.side_effect = RuntimeError("Unexpected query error")

    try:
        acknowledge_alert(mock_db, alert_id=1, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to acknowledge alert" in exc.detail
        mock_db.rollback.assert_called_once()


def test_acknowledge_alert_endpoint_post_handles_db_error(client, register_admin):
    """POST /alerts/{id}/acknowledge with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.acknowledge_alert",
        side_effect=OperationalError("UPDATE", {}, Exception("Database offline")),
    ):
        resp = client.post(
            "/alerts/1/acknowledge",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_acknowledge_alert_endpoint_put_handles_db_error(client, register_admin):
    """PUT /alerts/{id}/acknowledge with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.acknowledge_alert",
        side_effect=OperationalError("UPDATE", {}, Exception("Database offline")),
    ):
        resp = client.put(
            "/alerts/1/acknowledge",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]
