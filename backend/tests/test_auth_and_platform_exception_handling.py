"""Exception handling regression tests for auth and platform OTP flows."""

from unittest.mock import patch

from sqlalchemy.exc import OperationalError


def test_reset_password_endpoint_handles_value_error(client):
    with patch(
        "app.api.auth.PasswordResetService.reset_password",
        side_effect=ValueError("Password was used previously. Choose a new password."),
    ):
        response = client.post(
            "/auth/reset-password",
            json={"token": "token-123", "password": "StrongPass!123"},
        )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Password was used previously. Choose a new password."


def test_reset_password_endpoint_handles_sqlalchemy_error(client):
    with patch(
        "app.api.auth.PasswordResetService.reset_password",
        side_effect=OperationalError("UPDATE users", {}, Exception("Database write failed")),
    ):
        response = client.post(
            "/auth/reset-password",
            json={"token": "token-123", "password": "StrongPass!123"},
        )

    assert response.status_code == 503, response.text
    assert response.json()["detail"] == "Database service unavailable"


def test_super_admin_verify_otp_endpoint_handles_generic_exception(client):
    with patch(
        "app.api.platform_api.SuperAdminService.verify_login_otp",
        side_effect=RuntimeError("OTP verification crashed"),
    ):
        response = client.post(
            "/platform/auth/verify-otp",
            json={"challenge_token": "token-123", "otp": "123456"},
        )

    assert response.status_code == 500, response.text
    assert response.json()["detail"] == "Failed to verify OTP"
