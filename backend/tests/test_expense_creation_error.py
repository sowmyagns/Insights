"""Tests for transaction rollback and exception handling during expense creation."""

from datetime import date
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.schemas.accounts import ExpenseCreate
from app.services.accounts_service import create_expense


def test_create_expense_service_handles_commit_failure():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("INSERT INTO accounts_expenses", {}, Exception("DB commit failure"))

    payload = ExpenseCreate(
        expense_date=date(2026, 8, 14),
        category="Utilities",
        amount=4500.0,
        vendor="Electric Co",
        description="Electricity bill",
        tenant_id=1,
    )

    try:
        create_expense(mock_db, payload)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_create_expense_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.api.accounts.create_expense", side_effect=OperationalError("INSERT", {}, Exception("Database offline"))):
        resp = client.post(
            "/accounts/expenses",
            json={
                "expense_date": "2026-08-14",
                "category": "Maintenance",
                "amount": 8000.0,
                "vendor": "Parts Supplier",
                "description": "CNC machine repair",
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_create_expense_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.api.accounts.create_expense", side_effect=RuntimeError("Unexpected expense processing crash")):
        resp = client.post(
            "/accounts/expenses",
            json={
                "expense_date": "2026-08-14",
                "category": "Office",
                "amount": 1200.0,
                "description": "Stationery supplies",
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to create expense" in data["detail"]
