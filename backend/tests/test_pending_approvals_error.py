"""Tests: Pending Approvals exception handling.

Verifies that get_pending_approvals and pending_approvals endpoint properly
catch database exceptions (SQLAlchemyError) and general exceptions,
perform db.rollback(), and return controlled error responses (HTTP 503 / HTTP 500).
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.admin import pending_approvals
from app.models.user import User
from app.services.approval_service import get_pending_approvals


def test_get_pending_approvals_handles_db_error():
    """SQLAlchemyError during get_pending_approvals triggers db.rollback and re-raises."""
    mock_db = MagicMock()
    mock_db.scalar.side_effect = SQLAlchemyError("Database connection lost")

    with pytest.raises(SQLAlchemyError):
        get_pending_approvals(mock_db, tenant_id=1)

    mock_db.rollback.assert_called_once()


def test_get_pending_approvals_handles_generic_exception():
    """Generic Exception during get_pending_approvals is caught, logged, and re-raised."""
    mock_db = MagicMock()
    mock_db.scalar.side_effect = RuntimeError("Unexpected query failure")

    with pytest.raises(RuntimeError):
        get_pending_approvals(mock_db, tenant_id=1)


def test_pending_approvals_endpoint_handles_db_error():
    """pending_approvals endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()
    mock_admin = MagicMock(spec=User)
    mock_admin.tenant_id = 1

    with patch("app.services.approval_service.get_pending_approvals", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            pending_approvals(admin=mock_admin, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Pending approvals are temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


def test_pending_approvals_endpoint_handles_unexpected_error():
    """pending_approvals endpoint converts generic Exception into HTTP 500."""
    mock_db = MagicMock()
    mock_admin = MagicMock(spec=User)
    mock_admin.tenant_id = 1

    with patch("app.services.approval_service.get_pending_approvals", side_effect=RuntimeError("Unexpected error")):
        with pytest.raises(HTTPException) as exc_info:
            pending_approvals(admin=mock_admin, db=mock_db)

    assert exc_info.value.status_code == 500
    assert "An unexpected error occurred" in exc_info.value.detail
