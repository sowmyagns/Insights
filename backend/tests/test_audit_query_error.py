"""Tests: Audit Query exception handling & rollback.

Verifies that query_audit_logs, list_activities, and audit log query endpoints
properly catch database failures (SQLAlchemyError), execute db.rollback(),
and return controlled error responses (HTTP 503 / 500).
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.admin import list_access_logs
from app.api.audit_api import list_audit_logs, list_company_audit_logs, list_my_audit_logs
from app.models.user import User
from app.services.audit_log_service import query_audit_logs
from app.services.rbac_service import list_activities


def test_query_audit_logs_handles_db_error():
    """SQLAlchemyError during query_audit_logs triggers db.rollback and re-raises."""
    mock_db = MagicMock()
    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.tenant_id = 1

    # Simulate database error on db.scalar
    mock_db.scalar.side_effect = SQLAlchemyError("Database query failed")

    with pytest.raises(SQLAlchemyError):
        query_audit_logs(mock_db, mock_user, scope="me")

    mock_db.rollback.assert_called_once()


def test_list_activities_handles_db_error():
    """SQLAlchemyError during list_activities triggers db.rollback and re-raises."""
    mock_db = MagicMock()
    mock_db.scalars.side_effect = SQLAlchemyError("Database query failed")

    with pytest.raises(SQLAlchemyError):
        list_activities(mock_db, tenant_id=1)

    mock_db.rollback.assert_called_once()


def test_list_audit_logs_endpoint_handles_db_error():
    """list_audit_logs endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()
    mock_user = MagicMock(spec=User)

    with patch("app.services.audit_service.query_audit_logs", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            list_audit_logs(request=MagicMock(), current_user=mock_user, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


def test_list_company_audit_logs_endpoint_handles_db_error():
    """list_company_audit_logs endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()
    mock_admin = MagicMock(spec=User)

    with patch("app.services.audit_service.query_audit_logs", side_effect=SQLAlchemyError("DB offline")):
        with pytest.raises(HTTPException) as exc_info:
            list_company_audit_logs(admin=mock_admin, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()


def test_list_access_logs_admin_endpoint_handles_db_error():
    """list_access_logs admin endpoint converts SQLAlchemyError into HTTP 503 with db.rollback."""
    mock_db = MagicMock()
    mock_admin = MagicMock(spec=User)
    mock_admin.tenant_id = 1

    with patch("app.api.admin._svc") as mock_svc_factory:
        mock_svc = MagicMock()
        mock_svc.list_audit_logs.side_effect = SQLAlchemyError("DB offline")
        mock_svc_factory.return_value = mock_svc

        with pytest.raises(HTTPException) as exc_info:
            list_access_logs(admin=mock_admin, db=mock_db)

    assert exc_info.value.status_code == 503
    assert "Access logs are temporarily unavailable" in exc_info.value.detail
    mock_db.rollback.assert_called_once()
