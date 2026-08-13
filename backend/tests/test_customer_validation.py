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

    # Whitespace-only name rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="   ",
        )
    assert "Company Name is required and cannot be blank or whitespace-only" in str(exc_info.value)

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

def test_customer_contact_person_validation():
    # Valid contact person
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        contact_name="John Doe",
    )
    assert customer.contact_name == "John Doe"

    # Whitespace-only contact name coerced to None
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        contact_name="   ",
    )
    assert customer.contact_name is None

    # Numeric-only contact name rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            contact_name="123456",
        )
    assert "Contact Person name must contain at least one letter" in str(exc_info.value)

    # Special characters-only contact name rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            contact_name="@@@@@",
        )
    assert "Contact Person name must contain at least one letter" in str(exc_info.value)

def test_customer_email_validation():
    # Valid email
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        email="test@example.com",
    )
    assert customer.email == "test@example.com"

    # Whitespace-only email coerced to None
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        email="   ",
    )
    assert customer.email is None

    # Invalid email rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            email="invalid-email",
        )
    assert "Invalid email format" in str(exc_info.value)

    # Email with consecutive dots rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            email="test..24@gmail.com",
        )
    assert "Invalid email format" in str(exc_info.value)

    # Email without top-level domain rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            email="test25@gmail",
        )
    assert "Invalid email format" in str(exc_info.value)

def test_customer_phone_validation():
    # Valid 10-digit phone
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        phone="9876543210",
    )
    assert customer.phone == "9876543210"

    # Less than 10 digits phone rejected (9 digits)
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="123456789",
        )
    assert "Phone number must be exactly 10 numeric digits" in str(exc_info.value)

    # Less than 10 digits phone rejected (5 digits)
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="12345",
        )
    assert "Phone number must be exactly 10 numeric digits" in str(exc_info.value)

    # More than 10 digits phone rejected (11 digits)
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="12345678901",
        )
    assert "Phone number must be exactly 10 numeric digits" in str(exc_info.value)

    # More than 10 digits phone rejected (13 digits)
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            phone="1234567890123",
        )
    assert "Phone number must be exactly 10 numeric digits" in str(exc_info.value)

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
    # Valid uppercase GSTIN
    customer = CustomerCreate(
        tenant_id=1,
        name="Valid Company",
        gstin="27AAAAA0000A1Z2",
    )
    assert customer.gstin == "27AAAAA0000A1Z2"

    # Lowercase GSTIN rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            gstin="27aaaaa0000a1z2",
        )
    assert "GSTIN must contain only uppercase letters and numeric values" in str(exc_info.value)

    # Short GSTIN rejected
    with pytest.raises(ValidationError) as exc_info:
        CustomerCreate(
            tenant_id=1,
            name="Valid Company",
            gstin="27ABCDE1234F1",
        )
    assert "GST Number must be exactly 15 characters" in str(exc_info.value)
