"""Request schemas for admin user & role management (RBAC)."""

import re

from pydantic import BaseModel, Field, field_validator

from app.utils.password import PASSWORD_MIN_LENGTH, validate_password_strength
from app.utils.sanitize import sanitize_email_local_part


# Matches local@domain.tld — rejects leading/trailing dots, consecutive dots,
# multiple @, missing TLD, and other malformed structures.
_EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+"
    r"(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@"
    r"(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+"
    r"[a-zA-Z]{2,}$"
)


def _normalize_email(value: str) -> str:
    email = sanitize_email_local_part(value).lower().strip()
    if not email or email.count("@") != 1:
        raise ValueError("Invalid email address")
    if not _EMAIL_REGEX.match(email):
        raise ValueError(
            "Invalid email address: must be in the form local@domain.tld "
            "with a valid domain structure"
        )
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

    @field_validator("role_ids", mode="before")
    @classmethod
    def validate_role_ids(cls, value: list) -> list:
        if value is None:
            return []
        for item in value:
            try:
                v = int(item)
            except (TypeError, ValueError):
                raise ValueError("Each role ID must be a positive integer")
            if v < 1:
                raise ValueError(f"Role ID {v} is invalid: role IDs must be >= 1")
        return value

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

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        val_str = str(value).strip()
        if not val_str:
            return None
        if not val_str.isdigit():
            raise ValueError("Phone number must contain only numeric digits")
        if len(val_str) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return val_str


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

    @field_validator("role_ids", mode="before")
    @classmethod
    def validate_role_ids(cls, value: list | None) -> list | None:
        if value is None:
            return value
        for item in value:
            try:
                v = int(item)
            except (TypeError, ValueError):
                raise ValueError("Each role ID must be a positive integer")
            if v < 1:
                raise ValueError(f"Role ID {v} is invalid: role IDs must be >= 1")
        return value

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

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        val_str = str(value).strip()
        if not val_str:
            return None
        if not val_str.isdigit():
            raise ValueError("Phone number must contain only numeric digits")
        if len(val_str) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return val_str


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)
    permissions: list[str] = Field(default_factory=list)

    @field_validator("permissions", mode="before")
    @classmethod
    def validate_permissions(cls, value: list) -> list:
        if value is None:
            return []
        for item in value:
            if not isinstance(item, str) or not str(item).strip():
                raise ValueError(
                    "Permission entries must be non-empty, non-whitespace strings"
                )
        return value


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)
    permissions: list[str] | None = None

    @field_validator("permissions", mode="before")
    @classmethod
    def validate_permissions(cls, value: list | None) -> list | None:
        if value is None:
            return value
        for item in value:
            if not isinstance(item, str) or not str(item).strip():
                raise ValueError(
                    "Permission entries must be non-empty, non-whitespace strings"
                )
        return value


class RolePermissionsUpdate(BaseModel):
    permissions: list[str] = Field(default_factory=list)

    @field_validator("permissions", mode="before")
    @classmethod
    def validate_permissions(cls, value: list) -> list:
        if value is None:
            return []
        for item in value:
            if not isinstance(item, str) or not str(item).strip():
                raise ValueError(
                    "Permission entries must be non-empty, non-whitespace strings"
                )
        return value
