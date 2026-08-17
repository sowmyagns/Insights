import pytest
from pydantic import ValidationError

from app.schemas.production_planning import (
    ProductionMaterialRead,
    ProductionOrderDetailRead,
    ProductionOrderListRead,
)


def test_production_material_read_negative_quantities_rejected():
    """required_qty=-10, available_qty=-5, or issued_qty=-2 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionMaterialRead(component_name="Paper", required_qty=-10.0, available_qty=5.0)
    assert any(err["loc"] == ("required_qty",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductionMaterialRead(component_name="Paper", required_qty=10.0, available_qty=-5.0)
    assert any(err["loc"] == ("available_qty",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductionMaterialRead(
            component_name="Paper",
            required_qty=10.0,
            available_qty=5.0,
            issued_qty=-2.0,
        )
    assert any(err["loc"] == ("issued_qty",) for err in exc_info.value.errors())


def test_production_material_read_valid_quantities():
    """Zero or positive material quantities pass validation."""
    mat = ProductionMaterialRead(
        component_name="Paper",
        required_qty=10.0,
        available_qty=5.0,
        issued_qty=2.0,
    )
    assert mat.required_qty == 10.0
    assert mat.available_qty == 5.0
    assert mat.issued_qty == 2.0


def test_production_order_list_read_negative_planned_quantity_rejected():
    """planned_quantity=-100 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderListRead(
            id=1,
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=-100.0,
        )
    assert any(err["loc"] == ("planned_quantity",) for err in exc_info.value.errors())


def test_production_order_list_read_negative_produced_quantity_rejected():
    """produced_quantity=-20 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderListRead(
            id=1,
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=100.0,
            produced_quantity=-20.0,
        )
    assert any(err["loc"] == ("produced_quantity",) for err in exc_info.value.errors())


def test_production_order_list_read_negative_scrap_quantity_rejected():
    """scrap_quantity=-5 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderListRead(
            id=1,
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=100.0,
            scrap_quantity=-5.0,
        )
    assert any(err["loc"] == ("scrap_quantity",) for err in exc_info.value.errors())


def test_production_order_list_read_valid_quantities():
    """Zero or positive production quantities pass validation."""
    po = ProductionOrderListRead(
        id=1,
        tenant_id=1,
        product_id=1,
        order_number="PO-001",
        planned_quantity=100.0,
        produced_quantity=80.0,
        balance_quantity=20.0,
        scrap_quantity=2.0,
    )
    assert po.planned_quantity == 100.0
    assert po.produced_quantity == 80.0
    assert po.scrap_quantity == 2.0


def test_production_order_list_read_invalid_progress_pct_rejected():
    """progress_pct=150 or progress_pct=-10 raises ValidationError."""
    invalid_progress = [-10.0, -0.1, 100.1, 150.0]
    for p in invalid_progress:
        with pytest.raises(ValidationError) as exc_info:
            ProductionOrderListRead(
                id=1,
                tenant_id=1,
                product_id=1,
                order_number="PO-001",
                planned_quantity=100.0,
                progress_pct=p,
            )
        assert any(err["loc"] == ("progress_pct",) for err in exc_info.value.errors())


def test_production_order_list_read_valid_progress_pct():
    """progress_pct in [0, 100] passes validation."""
    for valid_p in [0.0, 25.5, 50.0, 100.0]:
        po = ProductionOrderListRead(
            id=1,
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=100.0,
            progress_pct=valid_p,
        )
        assert po.progress_pct == valid_p


def test_production_order_detail_read_invalid_percentage_fields_rejected():
    """scrap_pct=150, production_efficiency_pct=-10, machine_utilization_pct=150, operator_efficiency_pct=-20, or oee_pct=200 raises ValidationError."""
    base_kwargs = dict(
        id=1,
        tenant_id=1,
        product_id=1,
        order_number="PO-001",
        planned_quantity=100.0,
    )

    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderDetailRead(**base_kwargs, scrap_pct=150.0)
    assert any(err["loc"] == ("scrap_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderDetailRead(**base_kwargs, production_efficiency_pct=-10.0)
    assert any(err["loc"] == ("production_efficiency_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderDetailRead(**base_kwargs, machine_utilization_pct=150.0)
    assert any(err["loc"] == ("machine_utilization_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderDetailRead(**base_kwargs, operator_efficiency_pct=-20.0)
    assert any(err["loc"] == ("operator_efficiency_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderDetailRead(**base_kwargs, oee_pct=200.0)
    assert any(err["loc"] == ("oee_pct",) for err in exc_info.value.errors())


def test_production_order_detail_read_valid_percentage_fields():
    """Percentage fields within [0, 100] pass validation."""
    detail = ProductionOrderDetailRead(
        id=1,
        tenant_id=1,
        product_id=1,
        order_number="PO-001",
        planned_quantity=100.0,
        scrap_pct=2.5,
        production_efficiency_pct=95.0,
        machine_utilization_pct=88.0,
        operator_efficiency_pct=92.0,
        oee_pct=85.0,
    )
    assert detail.scrap_pct == 2.5
    assert detail.production_efficiency_pct == 95.0
    assert detail.machine_utilization_pct == 88.0
    assert detail.operator_efficiency_pct == 92.0
    assert detail.oee_pct == 85.0


def test_production_order_list_read_inconsistent_balance_quantity_rejected():
    """planned_quantity=100, produced_quantity=80, balance_quantity=500 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderListRead(
            id=1,
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=100.0,
            produced_quantity=80.0,
            balance_quantity=500.0,
        )
    assert "inconsistent with planned_quantity" in str(exc_info.value)


def test_production_order_list_read_consistent_balance_quantity():
    """Consistent balance_quantity passes validation."""
    po1 = ProductionOrderListRead(
        id=1,
        tenant_id=1,
        product_id=1,
        order_number="PO-001",
        planned_quantity=100.0,
        produced_quantity=80.0,
        balance_quantity=20.0,
    )
    assert po1.balance_quantity == 20.0

    # Auto-computed if omitted
    po2 = ProductionOrderListRead(
        id=2,
        tenant_id=1,
        product_id=1,
        order_number="PO-002",
        planned_quantity=100.0,
        produced_quantity=80.0,
    )
    assert po2.balance_quantity == 20.0
