"""Tests for transaction rollback and exception handling during alert retrieval (list_alerts & get_alert).

Covers:
- list_alerts() service rollback on DB query failure (OperationalError -> 503)
- get_alert() service rollback on DB query failure (OperationalError -> 503)
- GET /alerts endpoint DB error handling (503)
- GET /alerts/{id} endpoint DB error handling (503)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.alert_service import get_alert, list_alerts


def test_list_alerts_service_rolls_back_on_db_error():
    """Simulate a DB query error during list_alerts and verify rollback & 503 response."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError(
        "SELECT alerts", {}, Exception("Database connection lost during list_alerts")
    )

    try:
        list_alerts(mock_db, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_get_alert_service_rolls_back_on_db_error():
    """Simulate a DB query error during get_alert and verify rollback & 503 response."""
    mock_db = MagicMock()
    mock_db.get.side_effect = OperationalError(
        "SELECT alerts", {}, Exception("Database connection lost during get_alert")
    )

    try:
        get_alert(mock_db, alert_id=1, tenant_id=1)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_list_alerts_endpoint_handles_db_error(client, register_admin):
    """GET /alerts with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.list_alerts",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/alerts",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_get_alert_endpoint_handles_db_error(client, register_admin):
    """GET /alerts/{id} with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.get_alert",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/alerts/1",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]
