import pytest
from pydantic import ValidationError
from app.schemas.platform import (
    CreateCompanyRequest,
    SuperAdminVerifyOtpRequest,
    UpdateCompanyRequest,
    UpdateLicenseRequest,
    VALID_PLANS,
)


def test_update_company_request_valid_subscription_plans():
    """Valid subscription plans pass validation."""
    for plan in ("trial", "growth", "scale", "dominate", "enterprise", "GROWTH"):
        req = UpdateCompanyRequest(subscription_plan=plan)
        assert req.subscription_plan == plan.strip().lower()


def test_update_company_request_invalid_subscription_plan_rejected():
    """subscription_plan='invalid_plan' raises ValidationError checking against VALID_PLANS."""
    for invalid_plan in ("invalid_plan", "unknown", "super_plan", "free_123"):
        with pytest.raises(ValidationError) as exc_info:
            UpdateCompanyRequest(subscription_plan=invalid_plan)
        
        errors = exc_info.value.errors()
        assert any(err["loc"] == ("subscription_plan",) for err in errors)
        assert "Invalid plan" in str(exc_info.value)


def test_update_license_request_valid_plan_and_status():
    """Valid plan and status values pass validation."""
    for plan in ("trial", "growth", "scale", "dominate", "enterprise"):
        req = UpdateLicenseRequest(plan=plan, status="active")
        assert req.plan == plan
        assert req.status == "active"

    for status in ("active", "suspended", "expired", "cancelled", "licensed"):
        req = UpdateLicenseRequest(plan="growth", status=status)
        assert req.status == status


def test_update_license_request_invalid_plan_or_status_rejected():
    """Unsupported plan or status in UpdateLicenseRequest raises ValidationError."""
    for invalid_plan in ("invalid_plan", "pro_unsupported", "unknown"):
        with pytest.raises(ValidationError) as exc_info:
            UpdateLicenseRequest(plan=invalid_plan)
        assert any(err["loc"] == ("plan",) for err in exc_info.value.errors())

    for invalid_status in ("invalid_status", "unknown", "unsupported"):
        with pytest.raises(ValidationError) as exc_info:
            UpdateLicenseRequest(status=invalid_status)
        assert any(err["loc"] == ("status",) for err in exc_info.value.errors())


def test_super_admin_verify_otp_request_invalid_otp_rejected():
    """OTP containing non-numeric characters (e.g. '123456abc') raises ValidationError."""
    token = "a" * 32
    invalid_otps = ["123456abc", "12345a", "abcdef", "12345", "1234567", "123 45"]
    for otp in invalid_otps:
        with pytest.raises(ValidationError) as exc_info:
            SuperAdminVerifyOtpRequest(challenge_token=token, otp=otp)
        assert any(err["loc"] == ("otp",) for err in exc_info.value.errors())


def test_super_admin_verify_otp_request_valid_otp():
    """6-digit numeric OTP passes validation."""
    token = "a" * 32
    req = SuperAdminVerifyOtpRequest(challenge_token=token, otp="123456")
    assert req.otp == "123456"


def test_update_company_request_invalid_email_rejected():
    """company_email='invalid-email' raises ValidationError."""
    invalid_emails = ["invalid-email", "test@", "@domain.com", "test@domain", "   "]
    for email in invalid_emails:
        with pytest.raises(ValidationError) as exc_info:
            UpdateCompanyRequest(company_email=email)
        assert any(err["loc"] == ("company_email",) for err in exc_info.value.errors())


def test_update_company_request_valid_email():
    """Valid company email passes validation and is normalized to lowercase."""
    req = UpdateCompanyRequest(company_email="CONTACT@COMPANY.COM")
    assert req.company_email == "contact@company.com"


def test_update_company_request_invalid_mobile_rejected():
    """Invalid Indian mobile numbers raise ValidationError with normalize_indian_mobile()."""
    invalid_mobiles = ["123", "1234567890", "invalid-mobile", "   ", "5555555555"]
    for mobile in invalid_mobiles:
        with pytest.raises(ValidationError) as exc_info:
            UpdateCompanyRequest(mobile_number=mobile)
        assert any(err["loc"] == ("mobile_number",) for err in exc_info.value.errors())


def test_update_company_request_valid_mobile():
    """Valid 10-digit Indian mobile number starting with 6-9 is normalized."""
    req = UpdateCompanyRequest(mobile_number="+91 9876543210")
    assert req.mobile_number == "9876543210"
