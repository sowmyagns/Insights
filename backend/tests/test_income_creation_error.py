"""Tests for exception handling and session rollback during income creation."""

from datetime import date
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.schemas.accounts import IncomeCreate
from app.services.accounts_service import create_income


def test_create_income_service_handles_database_error():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("INSERT INTO accounts_incomes", {}, Exception("DB disconnect"))

    payload = IncomeCreate(
        income_date=date(2026, 8, 14),
        category="Sales",
        amount=15000.0,
        description="Consulting income",
        tenant_id=1,
    )

    try:
        create_income(mock_db, payload)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_create_income_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.api.accounts.create_income", side_effect=OperationalError("INSERT", {}, Exception("Database offline"))):
        resp = client.post(
            "/accounts/income",
            json={
                "income_date": "2026-08-14",
                "category": "Sales",
                "amount": 25000.0,
                "description": "Product sales",
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_create_income_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.api.accounts.create_income", side_effect=RuntimeError("Income processing crash")):
        resp = client.post(
            "/accounts/income",
            json={
                "income_date": "2026-08-14",
                "category": "Sales",
                "amount": 25000.0,
                "description": "Product sales",
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "Failed to create income" in data["detail"]
