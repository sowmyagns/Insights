"""Request schemas for admin user & role management (RBAC)."""

import re

from pydantic import BaseModel, Field, field_validator

from app.utils.password import PASSWORD_MIN_LENGTH, validate_password_strength
from app.utils.sanitize import sanitize_email_local_part, sanitize_text


def _normalize_email(value: str) -> str:
    email = sanitize_email_local_part(value).lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise ValueError("Invalid email address")
    local, _, domain = email.partition("@")
    if not local or not domain or "." not in domain:
        raise ValueError("Invalid email address")
    return email


class UserCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    full_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    employee_id: str | None = Field(None, max_length=64)
    designation: str | None = Field(None, max_length=128)
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=128)
    is_active: bool = True
    role_ids: list[int] = Field(default_factory=list)
    plant_code: str | None = Field(None, max_length=64)
    department: str | None = Field(None, max_length=128)
    assigned_machine_id: int | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = sanitize_text(value, max_length=100) or ""
        if not cleaned or not re.search(r"[A-Za-z]", cleaned):
            raise ValueError("Full Name must contain at least one letter")
        if len(cleaned) > 100:
            raise ValueError("Full Name must be 100 characters or fewer")
        if not re.fullmatch(r"[A-Za-z][A-Za-z\s.'-]*", cleaned):
            raise ValueError("Full Name contains invalid characters")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        cleaned = sanitize_text(value, max_length=20) or ""
        if not re.fullmatch(r"\d{10}", cleaned):
            raise ValueError("Phone must be exactly 10 digits")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        validate_password_strength(value)
        return value


class UserUpdate(BaseModel):
    email: str | None = Field(None, min_length=3, max_length=255)
    full_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    employee_id: str | None = Field(None, max_length=64)
    designation: str | None = Field(None, max_length=128)
    password: str | None = Field(None, min_length=PASSWORD_MIN_LENGTH, max_length=128)
    is_active: bool | None = None
    role_ids: list[int] | None = None
    plant_code: str | None = Field(None, max_length=64)
    department: str | None = Field(None, max_length=128)
    assigned_machine_id: int | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _normalize_email(value)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = sanitize_text(value, max_length=100) or ""
        if not cleaned or not re.search(r"[A-Za-z]", cleaned):
            raise ValueError("Full Name must contain at least one letter")
        if len(cleaned) > 100:
            raise ValueError("Full Name must be 100 characters or fewer")
        if not re.fullmatch(r"[A-Za-z][A-Za-z\s.'-]*", cleaned):
            raise ValueError("Full Name contains invalid characters")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        cleaned = sanitize_text(value, max_length=20) or ""
        if not re.fullmatch(r"\d{10}", cleaned):
            raise ValueError("Phone must be exactly 10 digits")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str | None) -> str | None:
        if value is None:
            return value
        validate_password_strength(value)
        return value


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)
    permissions: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)
    permissions: list[str] | None = None


class RolePermissionsUpdate(BaseModel):
    permissions: list[str] = Field(default_factory=list)
