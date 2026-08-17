"""Tests for transaction rollback and exception handling during alert creation / emission.

Covers:
- emit_alert() rollback on DB commit failure (OperationalError -> 503)
- emit_alert() rollback on generic exception (RuntimeError -> 500)
- create_alert() service rollback on DB commit failure (OperationalError -> 503)
- POST /alerts endpoint error handling (503 and 500)
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.schemas.alert import AlertCreate
from app.services.alert_event_service import emit_alert
from app.services.alert_service import create_alert


def test_emit_alert_rolls_back_on_commit_failure():
    """Simulate a database commit failure during emit_alert and verify rollback."""
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError(
        "INSERT INTO alerts", {}, Exception("DB connection lost during alert commit")
    )

    try:
        emit_alert(
            mock_db,
            tenant_id=1,
            alert_type="low_stock",
            title="Low Stock Warning",
            message="Item X is below threshold",
        )
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_emit_alert_rolls_back_on_generic_exception():
    """Simulate an unexpected failure during emit_alert and verify rollback."""
    mock_db = MagicMock()
    mock_db.flush.side_effect = RuntimeError("Unexpected flush error")

    try:
        emit_alert(
            mock_db,
            tenant_id=1,
            alert_type="system",
            title="System Alert",
        )
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to emit alert" in exc.detail
        mock_db.rollback.assert_called_once()


def test_create_alert_service_rolls_back_on_commit_failure():
    """Simulate a DB failure during create_alert and verify rollback."""
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError(
        "INSERT INTO alerts", {}, Exception("DB commit failure")
    )

    payload = AlertCreate(
        tenant_id=1,
        alert_type="quality",
        title="Quality Issue",
        message="Defect detected",
        severity="high",
    )

    try:
        create_alert(mock_db, payload)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_create_alert_endpoint_handles_db_error(client, register_admin):
    """POST /alerts with DB failure returns 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.create_alert",
        side_effect=OperationalError("INSERT", {}, Exception("Database offline")),
    ):
        resp = client.post(
            "/alerts",
            json={
                "tenant_id": 1,
                "alert_type": "maintenance",
                "title": "Scheduled Maintenance",
                "severity": "medium",
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_create_alert_endpoint_handles_generic_exception(client, register_admin):
    """POST /alerts with generic failure returns 500."""
    admin_auth = register_admin()

    with patch(
        "app.api.alerts.create_alert",
        side_effect=RuntimeError("Unexpected alert creation crash"),
    ):
        resp = client.post(
            "/alerts",
            json={
                "tenant_id": 1,
                "alert_type": "maintenance",
                "title": "Scheduled Maintenance",
                "severity": "medium",
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to create alert" in data["detail"]
