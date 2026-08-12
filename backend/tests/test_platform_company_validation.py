import pytest
from fastapi import HTTPException

from app.core.database import SessionLocal
from app.core.permissions import ADMIN_ROLE
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User, user_roles
from app.schemas.platform import CreateCompanyRequest
from app.services.platform_company_service import PlatformCompanyService


def test_create_company_rejects_name_with_only_special_chars_or_emoji():
    with pytest.raises(ValueError, match="alphabetic"):
        CreateCompanyRequest(
            company_name="😊😊😊",
            company_email="ops@company.com",
            admin_name="Jane Admin",
            admin_email="admin@company.com",
            mobile_number="9876543210",
            address="1 Main Street",
            city="Bengaluru",
            state="Karnataka",
            country="India",
            pin_code="560001",
            subscription_plan="trial",
        )

    with pytest.raises(ValueError, match="alphabetic"):
        CreateCompanyRequest(
            company_name="!!!@@@###",
            company_email="ops@company.com",
            admin_name="Jane Admin",
            admin_email="admin@company.com",
            mobile_number="9876543210",
            address="1 Main Street",
            city="Bengaluru",
            state="Karnataka",
            country="India",
            pin_code="560001",
            subscription_plan="trial",
        )


def test_reset_company_admin_password_rejects_deleted_company():
    db = SessionLocal()
    try:
        tenant = Tenant(
            name="Deleted Co",
            slug="deleted-co",
            email="deleted@company.com",
            phone="9876543210",
            status="deleted",
            subscription="trial",
            trial_status=False,
        )
        db.add(tenant)
        db.flush()

        role = Role(tenant_id=tenant.id, name=ADMIN_ROLE, description="Admin")
        db.add(role)
        db.flush()

        user = User(
            tenant_id=tenant.id,
            email="admin@deleted-company.com",
            full_name="Deleted Admin",
            hashed_password="hashed-password",
            is_active=True,
            email_verified=True,
        )
        db.add(user)
        db.flush()
        db.execute(user_roles.insert().values(user_id=user.id, role_id=role.id))

        with pytest.raises(HTTPException, match="deleted"):
            PlatformCompanyService(db).reset_company_admin_password(tenant.id, "NewPass!123")
    finally:
        db.close()
