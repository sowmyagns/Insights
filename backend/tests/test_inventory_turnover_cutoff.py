"""Tests: Inventory turnover calculation 12-month filter.

Verifies that get_inventory_turnover_rate() excludes StockMovement records
created older than 365 days ago.
"""

from datetime import datetime, timedelta
import pytest

from app.core.database import SessionLocal
from app.models.inventory import InventoryItem, StockLevel, StockMovement, Warehouse
from app.models.tenant import Tenant
from app.services.analytics_service import get_inventory_turnover_rate


def test_inventory_turnover_rate_respects_12_month_cutoff():
    """Stock movements older than 12 months (365 days) must be excluded from total_out_movements."""
    db = SessionLocal()
    try:
        # Create tenant, warehouse, item, stock level
        tenant = Tenant(name="Cutoff Test Tenant", slug="cutoff-test-tenant")
        db.add(tenant)
        db.flush()

        wh = Warehouse(tenant_id=tenant.id, name="Test Warehouse", code="WH-CUTOFF")
        db.add(wh)
        db.flush()

        item = InventoryItem(tenant_id=tenant.id, name="Cutoff Item", sku="SKU-CUTOFF", reorder_level=10)
        db.add(item)
        db.flush()

        sl = StockLevel(item_id=item.id, warehouse_id=wh.id, quantity=100)
        db.add(sl)
        db.flush()

        now = datetime.now()

        # 1. Old movement (> 12 months ago: 400 days old) with quantity = 50
        old_sm = StockMovement(
            tenant_id=tenant.id,
            warehouse_id=wh.id,
            item_id=item.id,
            quantity=50,
            movement_type="out",
            created_at=now - timedelta(days=400),
        )
        db.add(old_sm)

        # 2. Recent movement (< 12 months ago: 30 days old) with quantity = 20
        recent_sm = StockMovement(
            tenant_id=tenant.id,
            warehouse_id=wh.id,
            item_id=item.id,
            quantity=20,
            movement_type="out",
            created_at=now - timedelta(days=30),
        )
        db.add(recent_sm)
        db.commit()

        # Calculate turnover rate
        result = get_inventory_turnover_rate(db, tenant_id=tenant.id)

        # Only recent movement (20) should be included, old movement (50) should be ignored
        assert result["total_out_movements"] == 20.0
        # Average inventory = 100 / 1 = 100
        # Rate = 20 / 100 = 0.2
        assert result["average_inventory"] == 100.0
        assert result["rate"] == 0.2
    finally:
        db.close()
