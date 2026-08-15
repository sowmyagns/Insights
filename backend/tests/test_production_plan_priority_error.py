"""Tests for exception handling and session rollback on PATCH /api/production/planning/{plan_id}/priority."""

from unittest.mock import MagicMock, patch
from sqlalchemy.exc import OperationalError

from app.models.production import ProductionOrder


def test_production_plan_priority_handles_commit_failure(client, register_admin):
    admin_auth = register_admin()
    mock_order = MagicMock(spec=ProductionOrder)
    mock_order.id = 1
    mock_order.priority = "medium"

    with patch("sqlalchemy.orm.Session.query") as mock_query:
        mock_query.return_value.filter.return_value.first.return_value = mock_order
        with patch("sqlalchemy.orm.Session.commit", side_effect=OperationalError("COMMIT", {}, Exception("Database lock"))):
            resp = client.patch(
                "/api/production/planning/1/priority?priority=high",
                headers=admin_auth["headers"],
            )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error updating production plan priority" in data["message"]
    assert "errors" in data


def test_production_plan_priority_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()
    mock_order = MagicMock(spec=ProductionOrder)
    mock_order.id = 1
    mock_order.priority = "medium"

    with patch("sqlalchemy.orm.Session.query") as mock_query:
        mock_query.return_value.filter.return_value.first.return_value = mock_order
        with patch("sqlalchemy.orm.Session.commit", side_effect=RuntimeError("System crash during commit")):
            resp = client.patch(
                "/api/production/planning/1/priority?priority=high",
                headers=admin_auth["headers"],
            )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to update production plan priority" in data["message"]
    assert "errors" in data

