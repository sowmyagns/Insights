"""Tests for exception handling in the Profit & Loss report endpoint and service.

Covers:
- SQLAlchemyError during P&L generation → rollback + HTTP 503
- Generic Exception during P&L generation → rollback + HTTP 500
- Endpoint-level: patched service raising OperationalError → HTTP 503
- Endpoint-level: patched service raising RuntimeError → HTTP 500
"""

from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.services.accounts_service import get_profit_loss


# ---------------------------------------------------------------------------
# Service-layer unit tests
# ---------------------------------------------------------------------------

def test_profit_loss_service_rolls_back_on_db_error():
    """OperationalError on first db.execute() → rollback + HTTP 503."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = OperationalError(
        "SELECT invoices", {}, Exception("DB connection lost during P&L")
    )

    try:
        get_profit_loss(mock_db, tenant_id=1, year=2025)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Database connection unavailable" in exc.detail
        mock_db.rollback.assert_called_once()


def test_profit_loss_service_rolls_back_on_generic_exception():
    """Unexpected runtime error during P&L computation → rollback + HTTP 500."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = RuntimeError("Unexpected crash in P&L")

    try:
        get_profit_loss(mock_db, tenant_id=1, year=2025)
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert "profit & loss report" in exc.detail.lower()
        mock_db.rollback.assert_called_once()


# ---------------------------------------------------------------------------
# Endpoint-layer integration tests (via TestClient)
# ---------------------------------------------------------------------------

def test_profit_loss_endpoint_db_error_returns_503(client, register_admin):
    """GET /accounts/profit-loss?year=2025 with DB failure → 503."""
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.get_profit_loss",
        side_effect=OperationalError("SELECT", {}, Exception("Database offline")),
    ):
        resp = client.get(
            "/accounts/profit-loss?year=2025",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
    assert "Database connection unavailable" in data["detail"]


def test_profit_loss_endpoint_generic_exception_returns_500(client, register_admin):
    """GET /accounts/profit-loss?year=2025 with unexpected error → 500."""
    admin_auth = register_admin()

    with patch(
        "app.api.accounts.get_profit_loss",
        side_effect=RuntimeError("Unexpected P&L crash"),
    ):
        resp = client.get(
            "/accounts/profit-loss?year=2025",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert "detail" in data
    assert "profit & loss report" in data["detail"].lower()
