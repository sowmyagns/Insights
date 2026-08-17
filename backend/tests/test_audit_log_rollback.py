"""Tests: AuditLogService rollback on creation failure.

Verifies that AuditLogService.log executes db.rollback() when a database exception
(SQLAlchemyError or insert/commit failure) occurs.
"""

import pytest
from unittest.mock import MagicMock
from sqlalchemy.exc import SQLAlchemyError

from app.models.user import User
from app.services.audit_log_service import AuditLogService


def test_audit_log_service_log_rolls_back_on_insert_db_error():
    """Simulate a database failure during db.execute(insert(AccessLog)...) in AuditLogService.log."""
    mock_db = MagicMock()

    # _resolve_actor does db.scalars(select(Tenant)...) if user has no tenant, let's mock _resolve_actor output or setup mock_db
    mock_db.execute.side_effect = SQLAlchemyError("DB insert failed")
    mock_db.scalars.return_value.first.return_value = MagicMock(id=1, name="Test Tenant")

    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.tenant_id = 1
    mock_user.full_name = "Test User"
    mock_user.email = "test@example.com"
    mock_user.roles = []
    mock_user.tenant = MagicMock(id=1, name="Test Tenant")

    with pytest.raises(SQLAlchemyError):
        AuditLogService.log(
            db=mock_db,
            current_user=mock_user,
            action="create_user",
            module_name="Admin",
            details="Creating new user",
        )

    # Must execute db.rollback()
    mock_db.rollback.assert_called_once()


def test_audit_log_service_log_rolls_back_on_commit_db_error():
    """Simulate a database failure during db.commit() in AuditLogService.log."""
    mock_db = MagicMock()
    mock_db.commit.side_effect = SQLAlchemyError("Commit failed")

    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.tenant_id = 1
    mock_user.full_name = "Test User"
    mock_user.email = "test@example.com"
    mock_user.roles = []
    mock_user.tenant = MagicMock(id=1, name="Test Tenant")

    with pytest.raises(SQLAlchemyError):
        AuditLogService.log(
            db=mock_db,
            current_user=mock_user,
            action="update_settings",
            module_name="Settings",
            details="Updating settings",
            commit=True,
        )

    mock_db.rollback.assert_called_once()


def test_audit_log_service_log_rolls_back_on_generic_exception():
    """Simulate an unexpected exception during AuditLogService.log execution."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = RuntimeError("Unexpected internal error")

    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.tenant_id = 1
    mock_user.full_name = "Test User"
    mock_user.email = "test@example.com"
    mock_user.roles = []
    mock_user.tenant = MagicMock(id=1, name="Test Tenant")

    with pytest.raises(RuntimeError):
        AuditLogService.log(
            db=mock_db,
            current_user=mock_user,
            action="delete_item",
            module_name="Inventory",
            details="Deleting item",
        )

    mock_db.rollback.assert_called_once()


def test_log_audit_rolls_back_on_commit_failure():
    """Simulate a database commit failure in log_audit(). Ensures transaction rolls back."""
    from unittest.mock import patch
    from app.services.audit_service import log_audit

    mock_db = MagicMock()
    mock_db.commit.side_effect = SQLAlchemyError("Commit failure in log_audit")

    mock_row = MagicMock(ip_address=None)
    with patch("app.services.audit_service.AuditLogService.log", return_value=mock_row):
        with pytest.raises(SQLAlchemyError):
            log_audit(
                db=mock_db,
                tenant_id=1,
                user_id=10,
                action="update",
                resource="user_profile",
                ip_address="192.168.1.1",
            )

    mock_db.rollback.assert_called()


def test_log_audit_rolls_back_on_generic_exception():
    """Simulate an unexpected exception in log_audit(). Ensures transaction rolls back."""
    from unittest.mock import patch
    from app.services.audit_service import log_audit

    mock_db = MagicMock()
    mock_db.get.side_effect = RuntimeError("DB connection dropped")

    with pytest.raises(RuntimeError):
        log_audit(
            db=mock_db,
            tenant_id=1,
            user_id=10,
            action="update",
            resource="user_profile",
        )

    mock_db.rollback.assert_called_once()


def test_write_audit_log_rolls_back_on_commit_failure():
    """Simulate a database commit failure in write_audit_log(). Ensures transaction rolls back."""
    from unittest.mock import patch
    from app.services.audit_service import write_audit_log

    mock_db = MagicMock()
    mock_db.commit.side_effect = SQLAlchemyError("Commit failure in write_audit_log")

    mock_row = MagicMock(company_id=1, company_name="Test", full_name="User", role="Admin", tenant_id=1, ip_address="1.2.3.4", user_agent="Mozilla")
    with patch("app.services.audit_service.AuditLogService.log", return_value=mock_row):
        with pytest.raises(SQLAlchemyError):
            write_audit_log(
                db=mock_db,
                tenant_id=1,
                action="create",
                commit=True,
            )

    mock_db.rollback.assert_called()

