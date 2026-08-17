from datetime import date, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.production import (
    BatchCreate,
    DailyProductionReportCreate,
    MachineCreate,
    MachineStatusEventCreate,
    ProductionOrderBase,
    ProductionOrderCreate,
    WorkOrderCreate,
    WorkOrderQuickCreate,
    WorkOrderUpdate,
)


def test_production_order_create_negative_actual_quantity_rejected():
    """actual_quantity=-10 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderCreate(
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=100.0,
            actual_quantity=-10.0,
        )
    assert any(err["loc"] == ("actual_quantity",) for err in exc_info.value.errors())


def test_production_order_create_negative_produced_quantity_rejected():
    """produced_quantity=-5 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductionOrderCreate(
            tenant_id=1,
            product_id=1,
            order_number="PO-001",
            planned_quantity=100.0,
            produced_quantity=-5.0,
        )
    assert any(err["loc"] == ("produced_quantity",) for err in exc_info.value.errors())


def test_production_order_create_valid_quantities():
    """Zero or positive actual_quantity and produced_quantity pass validation."""
    po = ProductionOrderCreate(
        tenant_id=1,
        product_id=1,
        order_number="PO-001",
        planned_quantity=100.0,
        actual_quantity=80.0,
        produced_quantity=75.0,
    )
    assert po.planned_quantity == 100.0
    assert po.actual_quantity == 80.0
    assert po.produced_quantity == 75.0


def test_work_order_create_zero_or_negative_planned_quantity_rejected():
    """planned_quantity=0 or planned_quantity=-10 raises ValidationError."""
    for qty in [0.0, -10.0, -1.0]:
        with pytest.raises(ValidationError) as exc_info:
            WorkOrderCreate(
                tenant_id=1,
                production_order_id=1,
                planned_quantity=qty,
            )
        assert any(err["loc"] == ("planned_quantity",) for err in exc_info.value.errors())


def test_work_order_create_valid_planned_quantity():
    """Positive planned_quantity passes validation."""
    wo = WorkOrderCreate(
        tenant_id=1,
        production_order_id=1,
        planned_quantity=100.0,
    )
    assert wo.planned_quantity == 100.0


def test_work_order_create_negative_actual_quantity_rejected():
    """WorkOrderCreate with actual_quantity=-10 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        WorkOrderCreate(
            tenant_id=1,
            production_order_id=1,
            planned_quantity=100.0,
            actual_quantity=-10.0,
        )
    assert any(err["loc"] == ("actual_quantity",) for err in exc_info.value.errors())


def test_work_order_update_negative_actual_quantity_rejected():
    """WorkOrderUpdate with actual_quantity=-10 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        WorkOrderUpdate(actual_quantity=-10.0)
    assert any(err["loc"] == ("actual_quantity",) for err in exc_info.value.errors())


def test_work_order_valid_actual_quantity():
    """Zero or positive actual_quantity passes validation."""
    wo = WorkOrderCreate(
        tenant_id=1,
        production_order_id=1,
        planned_quantity=100.0,
        actual_quantity=50.0,
    )
    assert wo.actual_quantity == 50.0


def test_work_order_quick_create_zero_or_negative_planned_quantity_rejected():
    """planned_quantity=0 or planned_quantity=-5 raises ValidationError."""
    for qty in [0.0, -5.0, -1.0]:
        with pytest.raises(ValidationError) as exc_info:
            WorkOrderQuickCreate(
                product_id=1,
                planned_quantity=qty,
            )
        assert any(err["loc"] == ("planned_quantity",) for err in exc_info.value.errors())


def test_work_order_quick_create_valid_planned_quantity():
    """Positive planned_quantity passes validation."""
    wo = WorkOrderQuickCreate(
        product_id=1,
        planned_quantity=100.0,
    )
    assert wo.planned_quantity == 100.0


def test_batch_create_zero_or_negative_quantity_rejected():
    """quantity=0 or quantity=-10 raises ValidationError."""
    for qty in [0.0, -10.0, -1.0]:
        with pytest.raises(ValidationError) as exc_info:
            BatchCreate(
                tenant_id=1,
                work_order_id=1,
                batch_code="B001",
                quantity=qty,
            )
        assert any(err["loc"] == ("quantity",) for err in exc_info.value.errors())


def test_batch_create_valid_quantity():
    """Positive quantity passes validation."""
    batch = BatchCreate(
        tenant_id=1,
        work_order_id=1,
        batch_code="B001",
        quantity=50.0,
    )
    assert batch.quantity == 50.0


def test_machine_create_invalid_percentage_fields_rejected():
    """health_score=150 or efficiency_pct=-20 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        MachineCreate(tenant_id=1, code="M01", name="Machine 1", health_score=150.0)
    assert any(err["loc"] == ("health_score",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        MachineCreate(tenant_id=1, code="M01", name="Machine 1", efficiency_pct=-20.0)
    assert any(err["loc"] == ("efficiency_pct",) for err in exc_info.value.errors())


def test_machine_create_valid_percentage_fields():
    """health_score and efficiency_pct in [0, 100] pass validation."""
    m = MachineCreate(
        tenant_id=1,
        code="M01",
        name="Machine 1",
        health_score=95.0,
        efficiency_pct=88.5,
    )
    assert m.health_score == 95.0
    assert m.efficiency_pct == 88.5


def test_machine_status_event_ended_before_started_rejected():
    """ended_at earlier than started_at raises ValidationError."""
    now = datetime.now()
    earlier = now - timedelta(hours=1)
    with pytest.raises(ValidationError) as exc_info:
        MachineStatusEventCreate(
            tenant_id=1,
            machine_id=1,
            status="running",
            started_at=now,
            ended_at=earlier,
        )
    assert "ended_at cannot be earlier than started_at" in str(exc_info.value)


def test_machine_status_event_valid_time_range():
    """ended_at equal to or later than started_at passes validation."""
    now = datetime.now()
    later = now + timedelta(hours=1)
    event1 = MachineStatusEventCreate(
        tenant_id=1,
        machine_id=1,
        status="running",
        started_at=now,
        ended_at=later,
    )
    assert event1.ended_at == later

    event2 = MachineStatusEventCreate(
        tenant_id=1,
        machine_id=1,
        status="running",
        started_at=now,
        ended_at=now,
    )
    assert event2.ended_at == now


def test_daily_production_report_create_negative_produced_quantity_rejected():
    """produced_quantity=-10 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        DailyProductionReportCreate(
            tenant_id=1,
            report_date=date.today(),
            product_id=1,
            produced_quantity=-10.0,
        )
    assert any(err["loc"] == ("produced_quantity",) for err in exc_info.value.errors())


def test_daily_production_report_create_negative_scrap_quantity_rejected():
    """scrap_quantity=-5 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        DailyProductionReportCreate(
            tenant_id=1,
            report_date=date.today(),
            product_id=1,
            produced_quantity=100.0,
            scrap_quantity=-5.0,
        )
    assert any(err["loc"] == ("scrap_quantity",) for err in exc_info.value.errors())


def test_daily_production_report_create_valid_quantities():
    """Zero or positive report quantities pass validation."""
    report = DailyProductionReportCreate(
        tenant_id=1,
        report_date=date.today(),
        product_id=1,
        produced_quantity=100.0,
        scrap_quantity=5.0,
    )
    assert report.produced_quantity == 100.0
    assert report.scrap_quantity == 5.0


def test_daily_production_report_create_negative_downtime_minutes_rejected():
    """downtime_minutes=-30 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        DailyProductionReportCreate(
            tenant_id=1,
            report_date=date.today(),
            product_id=1,
            produced_quantity=100.0,
            downtime_minutes=-30,
        )
    assert any(err["loc"] == ("downtime_minutes",) for err in exc_info.value.errors())


def test_daily_production_report_create_valid_downtime_minutes():
    """Zero or positive downtime_minutes passes validation."""
    report = DailyProductionReportCreate(
        tenant_id=1,
        report_date=date.today(),
        product_id=1,
        produced_quantity=100.0,
        downtime_minutes=30,
    )
    assert report.downtime_minutes == 30
