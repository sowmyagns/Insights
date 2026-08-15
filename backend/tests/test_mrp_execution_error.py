"""Tests for exception handling on POST /api/production/mrp/run."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_run_mrp_endpoint_handles_database_error(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.manufacturing_workflow_service.run_mrp", side_effect=OperationalError("SELECT", {}, Exception("Database offline"))):
        resp = client.post(
            "/api/production/mrp/run?product_id=1&quantity=10",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error executing MRP calculation" in data["message"]
    assert "errors" in data


def test_run_mrp_endpoint_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch("app.services.manufacturing_workflow_service.run_mrp", side_effect=RuntimeError("MRP calculation engine crashed")):
        resp = client.post(
            "/api/production/mrp/run?product_id=1&quantity=10",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to execute MRP calculation" in data["message"]
    assert "errors" in data
