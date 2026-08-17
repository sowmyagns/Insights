"""Tests for transaction rollback and exception handling during expense deletion.

Covers:
- IntegrityError (FK / constraint violation) → rollback + HTTP 409 with informative message
- Generic SQLAlchemyError (DB unavailable) → rollback + HTTP 503
- Generic Exception → rollback + HTTP 500
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError

from app.services.accounts_service import delete_expense


# ---------------------------------------------------------------------------
# Service-layer unit tests (direct, no HTTP layer)
# ---------------------------------------------------------------------------

def _make_db_with_expense():
    """Return a mock db session whose scalars().first() returns a fake expense."""
    mock_db = MagicMock()
    mock_expense = MagicMock()
    mock_db.scalars.return_value.first.return_value = mock_expense
    return mock_db, mock_expense


def test_delete_expense_service_rolls_back_on_integrity_error():
    """IntegrityError (FK constraint) → rollback + HTTP 409."""
    mock_db, _ = _make_db_with_expense()
    mock_db.commit.side_effect = IntegrityError(
        "DELETE accounts_expenses",
        {},
        Exception("foreign key constraint fails"),
    )

    try:
        delete_expense(mock_db, tenant_id=1, expense_id=10)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 409
        assert "referenced by another record" in exc.detail
        mock_db.rollback.assert_called_once()


def test_delete_expense_service_rolls_back_on_db_error():
    """OperationalError (DB unavailable) → rollback + HTTP 503."""
    mock_db, _ = _make_db_with_expense()
    mock_db.commit.side_effect = OperationalError(
        "DELETE accounts_expenses",
        {},
        Exception("DB connection lost"),
    )

    try:
        delete_expense(mock_db, tenant_id=1, expense_id=11)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_delete_expense_service_rolls_back_on_generic_exception():
    """Unexpected runtime error → rollback + HTTP 500."""
    mock_db, _ = _make_db_with_expense()
    mock_db.delete.side_effect = RuntimeError("Unexpected crash during delete")

    try:
        delete_expense(mock_db, tenant_id=1, expense_id=12)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "Failed to delete expense" in exc.detail
        mock_db.rollback.assert_called_once()


# ---------------------------------------------------------------------------
# Endpoint-layer integration tests (via TestClient)
# ---------------------------------------------------------------------------

def test_delete_expense_endpoint_integrity_constraint_returns_409(client, register_admin):
    """DELETE /accounts/expenses/{id} with IntegrityError → 409 Conflict."""
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.delete_expense",
        side_effect=IntegrityError(
            "DELETE accounts_expenses",
            {},
            Exception("foreign key constraint fails"),
        ),
    ):
        resp = client.delete(
            "/accounts/expenses/99",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 409
    data = resp.json()
    assert "detail" in data
    assert "referenced by another record" in data["detail"]


def test_delete_expense_endpoint_db_error_returns_503(client, register_admin):
    """DELETE /accounts/expenses/{id} with DB failure → 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.delete_expense",
        side_effect=OperationalError("DELETE", {}, Exception("Database offline")),
    ):
        resp = client.delete(
            "/accounts/expenses/98",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "Database connection unavailable" in data["detail"]


def test_delete_expense_endpoint_generic_exception_returns_500(client, register_admin):
    """DELETE /accounts/expenses/{id} with unexpected error → 500."""
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.delete_expense",
        side_effect=RuntimeError("Unexpected delete crash"),
    ):
        resp = client.delete(
            "/accounts/expenses/97",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "Failed to delete expense" in data["detail"]
