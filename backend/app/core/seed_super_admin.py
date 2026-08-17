"""Ensure exactly one GNS Super Admin exists (from environment configuration)."""

import logging

from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.platform import PlatformSuperAdmin
from app.services.auth_service import hash_password, verify_password

logger = logging.getLogger("gns_insights.seed")


def seed_super_admin(db) -> None:
    settings = get_settings()
    if not settings.super_admin_email or not settings.super_admin_password:
        logger.warning(
            "Super Admin not seeded — set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env"
        )
        return

    email = settings.super_admin_email.strip().lower()
    password = settings.super_admin_password
    mobile = (settings.super_admin_mobile or "+910000000000").strip()

    count = db.scalar(select(func.count(PlatformSuperAdmin.id))) or 0
    if count > 0:
        existing = db.scalars(select(PlatformSuperAdmin)).first()
        if existing:
            changed = False
            if existing.email != email:
                existing.email = email
                changed = True
            if mobile and existing.mobile != mobile:
                existing.mobile = mobile
                changed = True
            # Dev-only: sync password from .env. Production requires explicit reset flow.
            if (
                not settings.is_production
                and not verify_password(password, existing.hashed_password)
            ):
                existing.hashed_password = hash_password(password)
                changed = True
            if not existing.is_active:
                existing.is_active = True
                changed = True
            if changed:
                db.commit()
                logger.info("GNS Super Admin updated from .env: %s", existing.email)
        return

    admin = PlatformSuperAdmin(
        email=email,
        mobile=mobile,
        hashed_password=hash_password(password),
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("GNS Super Admin provisioned: %s", admin.email)
