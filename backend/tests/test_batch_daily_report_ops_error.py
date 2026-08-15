"""Tests for exception handling on batch and daily report endpoints in production_api.py."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_create_batch_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.production_service.create_batch", side_effect=OperationalError("INSERT", {}, Exception("Database lock"))):
        resp = client.post(
            "/api/production/batches",
            json={"tenant_id": 1, "work_order_id": 1, "batch_code": "BATCH-001", "quantity": 50},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error creating batch" in data["message"]
    assert "errors" in data


def test_get_batches_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.get_batch_summary", side_effect=OperationalError("SELECT", {}, Exception("DB connection failure"))):
        resp = client.get(
            "/api/production/batches",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert "Database connection unavailable" in data["message"]
    assert "errors" in data


def test_create_daily_report_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.create_daily_production_report", side_effect=OperationalError("INSERT", {}, Exception("DB disconnect"))):
        resp = client.post(
            "/api/production/daily-reports",
            json={
                "tenant_id": 1,
                "product_id": 1,
                "report_date": "2026-08-14",
                "work_order_id": 1,
                "produced_quantity": 100,
            },
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error creating daily report" in data["message"]
    assert "errors" in data


def test_get_daily_reports_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.routers.production_api.list_daily_production_reports", side_effect=OperationalError("SELECT", {}, Exception("DB offline"))):
        resp = client.get(
            "/api/production/daily-reports",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert "Database connection unavailable" in data["message"]
    assert "errors" in data
