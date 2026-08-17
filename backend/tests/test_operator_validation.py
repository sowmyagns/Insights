import pytest
from pydantic import ValidationError
from app.schemas.operator import (
    BatchUpdateRequest,
    MachineBreakdownRequest,
    NotificationReadRequest,
    OperatorLoginRequest,
    ShopFloorUpdateRequest,
    WorkOrderActionRequest,
    WorkOrderProgressRequest,
)


def test_machine_breakdown_request_no_identifier_rejected():
    """Sending both machine_id=None and machine_code=None raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        MachineBreakdownRequest(machine_id=None, machine_code=None, description="Spindle issue")
    assert "At least one machine identifier" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        MachineBreakdownRequest(machine_id=None, machine_code="   ", description="Spindle issue")
    assert "At least one machine identifier" in str(exc_info.value)


def test_machine_breakdown_request_valid_identifier():
    """Providing machine_id or machine_code passes validation."""
    req1 = MachineBreakdownRequest(machine_id=3, description="Overheating issue")
    assert req1.machine_id == 3

    req2 = MachineBreakdownRequest(machine_code="MCH-01", description="Motor stalled")
    assert req2.machine_code == "MCH-01"


def test_work_order_action_request_no_identifier_rejected():
    """Sending both work_order_id=None and work_order_number=None raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        WorkOrderActionRequest(work_order_id=None, work_order_number=None)
    assert "At least one work-order identifier" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        WorkOrderActionRequest(work_order_id=None, work_order_number="   ")
    assert "At least one work-order identifier" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        ShopFloorUpdateRequest(work_order_id=None, work_order_number=None, produced_quantity=10.0)
    assert "At least one work-order identifier" in str(exc_info.value)


def test_work_order_action_request_valid_identifier():
    """Providing work_order_id or work_order_number passes validation."""
    req1 = WorkOrderActionRequest(work_order_id=5)
    assert req1.work_order_id == 5

    req2 = WorkOrderActionRequest(work_order_number="WO-101")
    assert req2.work_order_number == "WO-101"


def test_shop_floor_update_request_valid_quantities():
    """Non-negative produced_quantity and scrap_quantity pass validation."""
    req = ShopFloorUpdateRequest(work_order_id=1, produced_quantity=10.5, scrap_quantity=2.0)
    assert req.produced_quantity == 10.5
    assert req.scrap_quantity == 2.0

    req_zero = ShopFloorUpdateRequest(work_order_id=1, produced_quantity=0.0, scrap_quantity=0.0)
    assert req_zero.produced_quantity == 0.0
    assert req_zero.scrap_quantity == 0.0


def test_shop_floor_update_request_negative_produced_quantity_rejected():
    """produced_quantity=-10 should raise ValidationError with ge=0.0 constraint."""
    with pytest.raises(ValidationError) as exc_info:
        ShopFloorUpdateRequest(work_order_id=1, produced_quantity=-10.0, scrap_quantity=0.0)
    
    errors = exc_info.value.errors()
    assert any(err["loc"] == ("produced_quantity",) for err in errors)


def test_shop_floor_update_request_negative_scrap_quantity_rejected():
    """scrap_quantity=-5 should raise ValidationError with ge=0.0 constraint."""
    with pytest.raises(ValidationError) as exc_info:
        ShopFloorUpdateRequest(work_order_id=1, produced_quantity=10.0, scrap_quantity=-5.0)
    
    errors = exc_info.value.errors()
    assert any(err["loc"] == ("scrap_quantity",) for err in errors)


def test_work_order_progress_request_negative_quantities_rejected():
    """WorkOrderProgressRequest subclass also inherits ge=0.0 validation."""
    with pytest.raises(ValidationError) as exc_info:
        WorkOrderProgressRequest(work_order_id=1, produced_quantity=-10.0)
    assert any(err["loc"] == ("produced_quantity",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        WorkOrderProgressRequest(work_order_id=1, produced_quantity=5.0, scrap_quantity=-5.0)
    assert any(err["loc"] == ("scrap_quantity",) for err in exc_info.value.errors())


def test_batch_update_request_negative_quantity_rejected():
    """BatchUpdateRequest quantity=-100 or negative raises ValidationError with ge=0.0 constraint."""
    for invalid_qty in (-100.0, -1.0, -0.5):
        with pytest.raises(ValidationError) as exc_info:
            BatchUpdateRequest(batch_id=1, quantity=invalid_qty)
        assert any(err["loc"] == ("quantity",) for err in exc_info.value.errors())


def test_batch_update_request_negative_batch_id_rejected():
    """BatchUpdateRequest batch_id=-1 or 0 raises ValidationError with ge=1 constraint."""
    for invalid_id in (-1, 0):
        with pytest.raises(ValidationError) as exc_info:
            BatchUpdateRequest(batch_id=invalid_id, quantity=50.0)
        assert any(err["loc"] == ("batch_id",) for err in exc_info.value.errors())


def test_shop_floor_update_request_scrap_exceeds_produced_rejected():
    """scrap_quantity > produced_quantity (e.g., produced=10, scrap=20) raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ShopFloorUpdateRequest(work_order_id=1, produced_quantity=10.0, scrap_quantity=20.0)
    assert "scrap_quantity (20.0) cannot exceed produced_quantity (10.0)" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        WorkOrderProgressRequest(work_order_id=1, produced_quantity=10.0, scrap_quantity=20.0)
    assert "scrap_quantity (20.0) cannot exceed produced_quantity (10.0)" in str(exc_info.value)


def test_operator_status_validation():
    """Arbitrary status strings like 'invalid_status' raise ValidationError."""
    for s in ("invalid_status", "unknown", "fake_status"):
        with pytest.raises(ValidationError) as exc_info:
            ShopFloorUpdateRequest(work_order_id=1, status=s)
        assert any(err["loc"] == ("status",) for err in exc_info.value.errors())

        with pytest.raises(ValidationError) as exc_info:
            BatchUpdateRequest(batch_id=1, status=s)
        assert any(err["loc"] == ("status",) for err in exc_info.value.errors())

    # Valid statuses pass
    for valid_s in ("in_process", "running", "completed", "closed", "paused"):
        req = ShopFloorUpdateRequest(work_order_id=1, status=valid_s)
        assert req.status == valid_s

        b_req = BatchUpdateRequest(batch_id=1, status=valid_s)
        assert b_req.status == valid_s


def test_notification_read_request_invalid_ids_rejected():
    """Empty strings or non-numeric/non-positive IDs raise ValidationError."""
    invalid_payloads = [
        ["", "abc"],
        ["abc"],
        ["-1"],
        ["0"],
        ["1", "  "],
    ]
    for nids in invalid_payloads:
        with pytest.raises(ValidationError) as exc_info:
            NotificationReadRequest(notification_ids=nids)
        assert any(err["loc"] == ("notification_ids",) for err in exc_info.value.errors())


def test_notification_read_request_valid_ids():
    """Valid positive numeric IDs pass validation and are normalized to strings."""
    req1 = NotificationReadRequest(notification_ids=["1", "42", "100"])
    assert req1.notification_ids == ["1", "42", "100"]

    req2 = NotificationReadRequest(notification_ids=[1, 42])
    assert req2.notification_ids == ["1", "42"]


def test_operator_login_request_invalid_email_rejected():
    """Invalid email formats like 'abc', 'test@', '@domain.com' raise ValidationError."""
    invalid_emails = ["abc", "test@", "@domain.com", "test@domain", "", "   "]
    for email in invalid_emails:
        with pytest.raises(ValidationError) as exc_info:
            OperatorLoginRequest(email=email, password="secretpassword", role="operator")
        assert any(err["loc"] == ("email",) for err in exc_info.value.errors())


def test_operator_login_request_valid_email():
    """Valid email addresses pass validation and are normalized to lowercase."""
    req1 = OperatorLoginRequest(email="operator@example.com", password="secretpassword", role="operator")
    assert req1.email == "operator@example.com"

    req2 = OperatorLoginRequest(email="OPERATOR@GNS.COM", password="secretpassword", role="operator")
    assert req2.email == "operator@gns.com"
