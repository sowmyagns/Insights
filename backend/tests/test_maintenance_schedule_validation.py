from datetime import date
import pytest
from pydantic import ValidationError
from app.schemas.maintenance import MaintenanceScheduleCreate, MaintenanceScheduleBase


def test_maintenance_schedule_frequency_days_positive():
    """Valid positive frequency_days should pass schema validation."""
    valid_data = {
        "tenant_id": 1,
        "machine_id": 1,
        "task_name": "Monthly Checkup",
        "next_due_date": date(2026, 9, 1),
        "frequency_days": 30,
        "is_active": True,
    }
    obj = MaintenanceScheduleCreate(**valid_data)
    assert obj.frequency_days == 30


def test_maintenance_schedule_frequency_days_zero_rejected():
    """Zero frequency_days should fail validation with ge=1 constraint."""
    invalid_data = {
        "tenant_id": 1,
        "machine_id": 1,
        "task_name": "Zero Frequency Task",
        "next_due_date": date(2026, 9, 1),
        "frequency_days": 0,
        "is_active": True,
    }
    with pytest.raises(ValidationError) as exc_info:
        MaintenanceScheduleCreate(**invalid_data)
    
    errors = exc_info.value.errors()
    assert any(err["loc"] == ("frequency_days",) for err in errors)


def test_maintenance_schedule_frequency_days_negative_rejected():
    """Negative frequency_days should fail validation with ge=1 constraint."""
    invalid_data = {
        "tenant_id": 1,
        "machine_id": 1,
        "task_name": "Negative Frequency Task",
        "next_due_date": date(2026, 9, 1),
        "frequency_days": -10,
        "is_active": True,
    }
    with pytest.raises(ValidationError) as exc_info:
        MaintenanceScheduleCreate(**invalid_data)
    
    errors = exc_info.value.errors()
    assert any(err["loc"] == ("frequency_days",) for err in errors)
