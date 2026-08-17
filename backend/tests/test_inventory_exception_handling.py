"""Regression tests for inventory transfer/adjustment validation exceptions."""


def _seed_inventory(client, auth):
    wh = client.post(
        "/inventory/warehouses",
        json={
            "tenant_id": 1,
            "name": "Main Warehouse",
            "code": "WH-01",
            "capacity": 1000,
            "is_primary": True,
        },
        headers=auth["headers"],
    )
    assert wh.status_code == 200, wh.text
    warehouse_id = wh.json()["id"]

    item = client.post(
        "/inventory/items",
        json={
            "tenant_id": 1,
            "name": "Steel Rod",
            "sku": "STEEL-01",
            "unit": "kg",
            "item_type": "raw_material",
            "quantity": 100,
            "reorder_level": 10,
            "unit_cost": 15.5,
        },
        headers=auth["headers"],
    )
    assert item.status_code == 201, item.text
    item_id = item.json()["id"]

    return warehouse_id, item_id


def test_create_transfer_rejects_invalid_data(client, register_admin):
    auth = register_admin()
    warehouse_id, item_id = _seed_inventory(client, auth)

    response = client.post(
        "/inventory/transfers",
        json={
            "from_warehouse_id": warehouse_id,
            "to_warehouse_id": warehouse_id,
            "item_id": item_id,
            "quantity": 0,
            "transfer_date": "2026-08-17",
        },
        headers=auth["headers"],
    )

    assert response.status_code == 400, response.text
    assert "greater than zero" in response.json()["detail"].lower()


def test_update_transfer_status_rejects_bad_status(client, register_admin):
    auth = register_admin()
    warehouse_id, item_id = _seed_inventory(client, auth)

    transfer = client.post(
        "/inventory/transfers",
        json={
            "from_warehouse_id": warehouse_id,
            "to_warehouse_id": warehouse_id + 1 if False else warehouse_id,
            "item_id": item_id,
            "quantity": 10,
            "transfer_date": "2026-08-17",
        },
        headers=auth["headers"],
    )
    assert transfer.status_code == 400, transfer.text

    # Second valid transfer to exercise status validation.
    second_wh = client.post(
        "/inventory/warehouses",
        json={
            "tenant_id": 1,
            "name": "Second Warehouse",
            "code": "WH-02",
            "capacity": 1200,
            "is_primary": False,
        },
        headers=auth["headers"],
    )
    assert second_wh.status_code == 200, second_wh.text
    second_warehouse_id = second_wh.json()["id"]

    valid_transfer = client.post(
        "/inventory/transfers",
        json={
            "from_warehouse_id": warehouse_id,
            "to_warehouse_id": second_warehouse_id,
            "item_id": item_id,
            "quantity": 10,
            "transfer_date": "2026-08-17",
        },
        headers=auth["headers"],
    )
    assert valid_transfer.status_code == 200, valid_transfer.text
    transfer_id = valid_transfer.json()["id"]

    invalid_status = client.patch(
        f"/inventory/transfers/{transfer_id}/status",
        json={"status": "bad_value"},
        headers=auth["headers"],
    )

    assert invalid_status.status_code == 400, invalid_status.text
    assert "invalid transfer status" in invalid_status.json()["detail"].lower()


def test_create_adjustment_rejects_negative_value(client, register_admin):
    auth = register_admin()
    warehouse_id, item_id = _seed_inventory(client, auth)

    response = client.post(
        "/inventory/adjustments",
        json={
            "adjustment_date": "2026-08-17",
            "warehouse_id": warehouse_id,
            "item_id": item_id,
            "new_qty": -5,
            "reason": "Stock Count Adjustment",
        },
        headers=auth["headers"],
    )

    assert response.status_code == 400, response.text
    assert "cannot be negative" in response.json()["detail"].lower()


def test_inventory_v2_stock_remove_rejects_overdraw(client, register_admin):
    auth = register_admin()

    create_item = client.post(
        "/inventory/v2/items",
        json={
            "name": "Widget",
            "sku": "WGT-001",
            "unit": "pcs",
            "purchase_price": 10,
            "selling_price": 15,
            "current_stock": 5,
        },
        headers=auth["headers"],
    )
    assert create_item.status_code == 200, create_item.text
    item_id = create_item.json()["data"]["id"]

    response = client.post(
        f"/inventory/v2/items/{item_id}/remove-stock",
        json={"quantity": 99, "unit": "pcs", "remark": "Test overdraw"},
        headers=auth["headers"],
    )

    assert response.status_code == 400, response.text
    assert "available stock" in response.json()["detail"].lower()


def test_sales_invoice_v2_rejects_unknown_customer(client, register_admin):
    auth = register_admin()

    response = client.post(
        "/sales/invoices",
        json={
            "customer_id": 999999,
            "document_type": "tax_invoice",
            "invoice_number": "INV-9001",
            "issue_date": "2026-08-17",
            "status": "issued",
            "items": [
                {
                    "item_description": "Test item",
                    "hsn": "6109",
                    "qty": 2,
                    "unit": "pcs",
                    "rate": 100,
                    "gst_pct": 18,
                }
            ],
        },
        headers=auth["headers"],
    )

    assert response.status_code == 400, response.text
    assert "customer" in response.json()["detail"].lower()
