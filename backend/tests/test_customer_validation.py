from app.schemas.sales import CustomerCreate, CustomerUpdate
import pytest
from pydantic import ValidationError

def test_customer_name_validation():
    # Valid customer creation
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
    )
    assert customer.name == "Valid Company"

    # Excessively long company name (>100 characters) rejected
    long_name = "A" * 150 + " Inc"
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name=long_name,
        )
    assert "Company Name cannot exceed 100 characters" in str(exc_info.value)

    # Whitespace-only name rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="   ",
        )
    assert "Company Name is required" in str(exc_info.value)

    # Special characters-only name rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="@@@@@",
        )
    assert "Company Name must contain at least one letter" in str(exc_info.value)

    # Numeric-only name rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="1234567",
        )
    assert "Company Name must contain at least one letter" in str(exc_info.value)

def test_customer_phone_validation():
    # Valid 10-digit phone starting with 6, 7, 8, or 9
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        phone="9876543210",
    )
    assert customer.phone == "9876543210"

    # Phone starting with 0 rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="0000000000",
        )
    assert "Mobile No. cannot start with 0" in str(exc_info.value)

    # Phone starting with 1 (1234567890) rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Mobile Test 2",
            phone="1234567890",
        )
    assert "Mobile No. cannot start with 1" in str(exc_info.value)

    # Phone starting with 09... rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="0987654321",
        )
    assert "Mobile No. cannot start with 0" in str(exc_info.value)

    # Less than 7 digits phone rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="12345",
        )
    assert "Phone number must be between 7 and 15 numeric digits" in str(exc_info.value)

    # Non-numeric phone rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="123456789A",
        )
    assert "Phone field must accept only numeric digits (0-9)" in str(exc_info.value)

    # Whitespace-only phone coerced to None
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        phone="   ",
    )
    assert customer.phone is None

def test_customer_gstin_validation():
    # Valid GSTIN
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        gstin="27AAAAA0000A1Z2",
    )
    assert customer.gstin == "27AAAAA0000A1Z2"

    # Lowercase GSTIN normalized to uppercase
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        gstin="27aaaaa0000a1z2",
    )
    assert customer.gstin == "27AAAAA0000A1Z2"
