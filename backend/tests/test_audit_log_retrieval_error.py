"""Tests for exception handling on GET /audit-logs endpoints when DB is unavailable."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_list_audit_logs_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.audit_service.query_audit_logs", side_effect=OperationalError("SELECT", {}, Exception("Database offline"))):
        resp = client.get(
            "/api/audit-logs",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert "Database connection unavailable" in data["message"]


def test_list_my_audit_logs_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.audit_service.query_audit_logs", side_effect=OperationalError("SELECT", {}, Exception("DB down"))):
        resp = client.get(
            "/api/audit-logs/me",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert "Database connection unavailable" in data["message"]


def test_list_company_audit_logs_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.audit_service.query_audit_logs", side_effect=OperationalError("SELECT", {}, Exception("DB connection timeout"))):
        resp = client.get(
            "/api/audit-logs/company",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert "Database connection unavailable" in data["message"]


def test_recent_logins_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.audit_service.recent_login_activity", side_effect=OperationalError("SELECT", {}, Exception("Database unavailable"))):
        resp = client.get(
            "/api/audit-logs/recent-logins",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert "Database connection unavailable" in data["message"]

