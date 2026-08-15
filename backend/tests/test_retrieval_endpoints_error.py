"""Tests for exception handling across retrieval endpoints (Dashboard, Product, Machine, Batch)."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.services.operator_service import OperatorService


def test_dashboard_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "get_dashboard",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database offline")),
    ):
        resp = client.get("/api/dashboard", headers=admin_auth["headers"])

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database connection unavailable"
    assert "errors" in data


def test_products_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "list_products",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database offline")),
    ):
        resp = client.get("/api/products", headers=admin_auth["headers"])

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database connection unavailable"
    assert "errors" in data


def test_machines_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "list_machines",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database offline")),
    ):
        resp = client.get("/api/machines", headers=admin_auth["headers"])

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database connection unavailable"
    assert "errors" in data


def test_batches_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorService,
        "list_batches",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database offline")),
    ):
        resp = client.get("/api/batches", headers=admin_auth["headers"])

    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Database connection unavailable"
    assert "errors" in data
