"""Tests for exception handling and session rollback on PATCH /api/production/planning/{plan_id}/machine."""

from unittest.mock import MagicMock, patch
from sqlalchemy.exc import OperationalError

from app.models.production import ProductionOrder, WorkOrder


def test_production_plan_machine_handles_commit_failure(client, register_admin):
    admin_auth = register_admin()
    mock_order = MagicMock(spec=ProductionOrder)
    mock_order.id = 1
    mock_order.machine_id = 1
    mock_order.order_number = "1001"
    mock_order.planned_quantity = 100

    mock_wo = MagicMock(spec=WorkOrder)

    with patch("sqlalchemy.orm.Session.query") as mock_query:
        # First query for ProductionOrder, second for WorkOrder
        mock_query.return_value.filter.return_value.first.side_effect = [mock_order, mock_wo]
        with patch("sqlalchemy.orm.Session.commit", side_effect=OperationalError("COMMIT", {}, Exception("Database failure"))):
            resp = client.patch(
                "/api/production/planning/1/machine?machine_id=2",
                headers=admin_auth["headers"],
            )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error assigning machine to production plan" in data["message"]
    assert "errors" in data


def test_production_plan_machine_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()
    mock_order = MagicMock(spec=ProductionOrder)
    mock_order.id = 1
    mock_order.machine_id = 1
    mock_order.order_number = "1001"
    mock_order.planned_quantity = 100

    mock_wo = MagicMock(spec=WorkOrder)

    with patch("sqlalchemy.orm.Session.query") as mock_query:
        mock_query.return_value.filter.return_value.first.side_effect = [mock_order, mock_wo]
        with patch("sqlalchemy.orm.Session.commit", side_effect=RuntimeError("System crash during commit")):
            resp = client.patch(
                "/api/production/planning/1/machine?machine_id=2",
                headers=admin_auth["headers"],
            )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to assign machine to production plan" in data["message"]
    assert "errors" in data
