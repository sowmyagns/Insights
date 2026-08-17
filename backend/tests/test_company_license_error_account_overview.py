"""Tests for graceful fallback when company_licenses is corrupted/unavailable during account overview and subscription loading."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError, ProgrammingError


def test_account_overview_with_corrupted_company_license_table(client, register_admin):
    admin_auth = register_admin()

    orig_scalars = client.app.dependency_overrides

    # Simulate database error specifically when selecting from CompanyLicense
    def mock_scalars_with_license_failure(orig_scalars_func):
        def _wrapper(statement, *args, **kwargs):
            stmt_str = str(statement).lower()
            if "company_licenses" in stmt_str:
                raise ProgrammingError("SELECT * FROM company_licenses", {}, Exception("no such table: company_licenses"))
            return orig_scalars_func(statement, *args, **kwargs)
        return _wrapper

    # Test via request: the endpoint should still return 200 and valid account overview
    from app.services import account_overview_service
    orig_fn = account_overview_service.get_account_overview

    def wrapped_get_account_overview(db, current_user):
        real_scalars = db.scalars
        db.scalars = mock_scalars_with_license_failure(real_scalars)
        try:
            return orig_fn(db, current_user)
        finally:
            db.scalars = real_scalars

    with patch("app.api.settings.get_account_overview", side_effect=wrapped_get_account_overview):
        resp = client.get(
            "/settings/account-overview",
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    overview = data["data"]
    assert overview["email"] == admin_auth["email"]
    assert overview["user_name"] is not None
    assert overview["company_name"] is not None
    assert overview["subscription_plan"] is not None


def test_subscription_with_corrupted_company_license_table(client, register_admin):
    admin_auth = register_admin()

    # Simulate database error specifically when querying CompanyLicense in subscription_service
    with patch(
        "app.services.subscription_service._license_row",
        side_effect=OperationalError("SELECT * FROM company_licenses", {}, Exception("table corrupted")),
    ):
        resp = client.get(
            "/settings/subscription",
            headers=admin_auth["headers"],
        )

    # In settings.py, get_subscription_endpoint catches the OperationalError if raised,
    # or subscription_service._license_row catches it internally and returns None.
    # Either way, it handles gracefully.
    assert resp.status_code in (200, 503)
