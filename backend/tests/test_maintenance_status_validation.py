from datetime import date, datetime
import pytest
from pydantic import ValidationError
from app.schemas.maintenance import (
    MaintenanceRecordCreate,
    PreventiveMaintenanceCreate,
    BreakdownReportCreate,
    MaintenanceScheduleCreate,
    VALID_MAINTENANCE_RECORD_STATUSES,
    VALID_PREVENTIVE_STATUSES,
    VALID_BREAKDOWN_STATUSES,
)
from app.services.maintenance_service import update_breakdown_status


def test_maintenance_record_valid_status():
    """Valid maintenance record statuses pass validation."""
    for s in ("completed", "scheduled", "in_progress", "cancelled"):
        rec = MaintenanceRecordCreate(
            tenant_id=1,
            machine_id=1,
            maintenance_date=date(2026, 8, 16),
            maintenance_type="corrective",
            status=s,
        )
        assert rec.status == s


def test_maintenance_record_invalid_status_rejected():
    """Arbitrary/invalid maintenance record status raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        MaintenanceRecordCreate(
            tenant_id=1,
            machine_id=1,
            maintenance_date=date(2026, 8, 16),
            maintenance_type="corrective",
            status="invalid_status",
        )
    assert any(err["loc"] == ("status",) for err in exc_info.value.errors())


def test_preventive_maintenance_valid_status():
    """Valid preventive maintenance statuses pass validation."""
    for s in ("scheduled", "in_progress", "completed", "cancelled"):
        pm = PreventiveMaintenanceCreate(
            tenant_id=1,
            machine_id=1,
            schedule_date=date(2026, 8, 16),
            task_description="Monthly lubrication",
            status=s,
        )
        assert pm.status == s


def test_preventive_maintenance_invalid_status_rejected():
    """Arbitrary/invalid preventive maintenance status raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        PreventiveMaintenanceCreate(
            tenant_id=1,
            machine_id=1,
            schedule_date=date(2026, 8, 16),
            task_description="Monthly lubrication",
            status="invalid_status",
        )
    assert any(err["loc"] == ("status",) for err in exc_info.value.errors())


def test_breakdown_report_invalid_status_rejected():
    """Arbitrary/invalid breakdown report status raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        BreakdownReportCreate(
            tenant_id=1,
            machine_id=1,
            reported_at=datetime(2026, 8, 16, 10, 0, 0),
            status="invalid_status",
        )
    assert any(err["loc"] == ("status",) for err in exc_info.value.errors())


def test_update_breakdown_status_invalid_rejected():
    """update_breakdown_status service raises ValueError for invalid status."""
    with pytest.raises(ValueError, match="Invalid breakdown status 'invalid_status'"):
        update_breakdown_status(None, tenant_id=1, breakdown_id=999, status="invalid_status")


def test_preventive_maintenance_valid_frequency():
    """Valid preventive maintenance frequencies pass validation."""
    for f in ("daily", "weekly", "monthly", "yearly"):
        pm = PreventiveMaintenanceCreate(
            tenant_id=1,
            machine_id=1,
            schedule_date=date(2026, 8, 16),
            task_description="Periodic check",
            frequency=f,
        )
        assert pm.frequency == f


def test_preventive_maintenance_invalid_frequency_rejected():
    """Arbitrary/unsupported frequency like 'abc' raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        PreventiveMaintenanceCreate(
            tenant_id=1,
            machine_id=1,
            schedule_date=date(2026, 8, 16),
            task_description="Periodic check",
            frequency="abc",
        )
    assert any(err["loc"] == ("frequency",) for err in exc_info.value.errors())


def test_preventive_maintenance_completed_at_conflict_rejected():
    """scheduled status with populated completed_at should raise ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        PreventiveMaintenanceCreate(
            tenant_id=1,
            machine_id=1,
            schedule_date=date(2026, 8, 16),
            task_description="Periodic check",
            status="scheduled",
            completed_at=datetime(2026, 8, 16, 14, 0, 0),
        )
    assert "completed_at cannot be populated when status is 'scheduled'" in str(exc_info.value)


def test_preventive_maintenance_completed_at_valid():
    """completed status with populated completed_at should pass validation."""
    pm = PreventiveMaintenanceCreate(
        tenant_id=1,
        machine_id=1,
        schedule_date=date(2026, 8, 16),
        task_description="Periodic check",
        status="completed",
        completed_at=datetime(2026, 8, 16, 14, 0, 0),
    )
    assert pm.completed_at == datetime(2026, 8, 16, 14, 0, 0)
    assert pm.status == "completed"


def test_completed_maintenance_record_future_date_rejected():
    """Completed maintenance record with future maintenance_date should raise ValidationError."""
    future_date = date(2099, 12, 31)
    with pytest.raises(ValidationError) as exc_info:
        MaintenanceRecordCreate(
            tenant_id=1,
            machine_id=1,
            maintenance_date=future_date,
            maintenance_type="corrective",
            status="completed",
        )
    assert "Completed maintenance record cannot have a future maintenance_date." in str(exc_info.value)


def test_completed_maintenance_record_past_or_today_date_valid():
    """Completed maintenance record with today or past date should pass validation."""
    today = date.today()
    rec = MaintenanceRecordCreate(
        tenant_id=1,
        machine_id=1,
        maintenance_date=today,
        maintenance_type="corrective",
        status="completed",
    )
    assert rec.maintenance_date == today


def test_empty_or_whitespace_maintenance_type_rejected():
    """Empty or whitespace maintenance_type raises ValidationError."""
    for invalid in ("", "   ", " \t "):
        with pytest.raises(ValidationError) as exc_info:
            MaintenanceRecordCreate(
                tenant_id=1,
                machine_id=1,
                maintenance_date=date.today(),
                maintenance_type=invalid,
            )
        assert any(err["loc"] == ("maintenance_type",) for err in exc_info.value.errors())


def test_empty_or_whitespace_task_description_rejected():
    """Empty or whitespace task_description raises ValidationError."""
    for invalid in ("", "   ", " \t\n "):
        with pytest.raises(ValidationError) as exc_info:
            PreventiveMaintenanceCreate(
                tenant_id=1,
                machine_id=1,
                schedule_date=date.today(),
                task_description=invalid,
            )
        assert any(err["loc"] == ("task_description",) for err in exc_info.value.errors())


def test_empty_or_whitespace_task_name_rejected():
    """Empty or whitespace task_name raises ValidationError."""
    for invalid in ("", "   ", " \t "):
        with pytest.raises(ValidationError) as exc_info:
            MaintenanceScheduleCreate(
                tenant_id=1,
                machine_id=1,
                task_name=invalid,
                next_due_date=date.today(),
            )
        assert any(err["loc"] == ("task_name",) for err in exc_info.value.errors())
