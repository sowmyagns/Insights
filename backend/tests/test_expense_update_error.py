"""Tests for transaction rollback and exception handling during expense update."""

from datetime import date
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.accounts_service import update_expense


def test_update_expense_service_rolls_back_on_commit_failure():
    mock_db = MagicMock()
    # get_expense (scalars) returns a mock expense object
    mock_expense = MagicMock()
    mock_db.scalars.return_value.first.return_value = mock_expense
    # commit raises a DB error
    mock_db.commit.side_effect = OperationalError(
        "UPDATE accounts_expenses", {}, Exception("DB connection lost during update")
    )

    try:
        update_expense(mock_db, tenant_id=1, expense_id=42, data={"amount": 9500.0})
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_update_expense_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.update_expense",
        side_effect=OperationalError("UPDATE", {}, Exception("Database offline")),
    ):
        resp = client.put(
            "/accounts/expenses/999",
            json={"amount": 5000.0},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_update_expense_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.update_expense",
        side_effect=RuntimeError("Unexpected update crash"),
    ):
        resp = client.put(
            "/accounts/expenses/999",
            json={"category": "Office"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to update expense" in data["detail"]
