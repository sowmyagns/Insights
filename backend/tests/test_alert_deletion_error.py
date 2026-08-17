"""Tests for transaction rollback and exception handling during alert deletion.

Covers:
- delete_alert() service rollback on constraint violation (IntegrityError -> 409)
- delete_alert() service rollback on DB connection failure (OperationalError -> 503)
- DELETE /alerts/{id} endpoint constraint violation handling (409)
- DELETE /alerts/{id} endpoint DB error handling (503)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError

from app.models.alert import Alert
from app.services.alert_service import delete_alert


def test_delete_alert_service_rolls_back_on_integrity_error():
    """Simulate a foreign key constraint violation during delete_alert and verify rollback & 409 response."""
    mock_db = MagicMock()
    mock_alert = Alert(id=1, tenant_id=1)
    mock_db.get.return_value = mock_alert
    mock_db.commit.side_effect = IntegrityError(
        "DELETE FROM alerts", {}, Exception("foreign key constraint fails")
    )

    try:
        delete_alert(mock_db, alert_id=1, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 409
        assert "referenced by another record" in exc.detail
        mock_db.rollback.assert_called_once()


def test_delete_alert_service_rolls_back_on_db_error():
    """Simulate a DB connection failure during delete_alert and verify rollback & 503 response."""
    mock_db = MagicMock()
    mock_alert = Alert(id=1, tenant_id=1)
    mock_db.get.return_value = mock_alert
    mock_db.commit.side_effect = OperationalError(
        "DELETE FROM alerts", {}, Exception("DB connection lost")
    )

    try:
        delete_alert(mock_db, alert_id=1, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_delete_alert_endpoint_integrity_constraint_returns_409(client, register_admin):
    """DELETE /alerts/{id} with IntegrityError returns 409."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.delete_alert",
        side_effect=IntegrityError("DELETE", {}, Exception("foreign key constraint fails")),
    ):
        resp = client.delete(
            "/alerts/1",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 409
    data = resp.json()
    assert "detail" in data
    assert "referenced by another record" in data["detail"]


def test_delete_alert_endpoint_db_error_returns_503(client, register_admin):
    """DELETE /alerts/{id} with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.delete_alert",
        side_effect=OperationalError("DELETE", {}, Exception("Database offline")),
    ):
        resp = client.delete(
            "/alerts/1",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]
