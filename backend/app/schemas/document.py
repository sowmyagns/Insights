import base64
import re
from typing import Any
from urllib.parse import unquote

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.sanitize import sanitize_text

_DATA_URL_RE = re.compile(
    r"^data:(?P<mime>[a-zA-Z0-9\+\-\./]+)(?P<base64>;base64)?,(?P<data>.*)$",
    re.DOTALL,
)

ALLOWED_DATA_URL_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "text/plain",
    "text/csv",
    "application/json",
    "application/octet-stream",
}


def _validate_data_url(raw: str) -> str:
    if len(raw) > 2_000_000:
        raise ValueError("Data URL payload exceeds maximum allowed size (2MB).")
    match = _DATA_URL_RE.match(raw)
    if not match:
        raise ValueError("Invalid Data URL format.")
    mime = match.group("mime").lower()
    if mime not in ALLOWED_DATA_URL_MIMES:
        raise ValueError(f"Unsupported Data URL MIME type '{mime}'.")
    is_b64 = bool(match.group("base64"))
    encoded_data = match.group("data").strip()
    if is_b64:
        try:
            base64.b64decode(encoded_data, validate=True)
        except Exception as exc:
            raise ValueError("Invalid base64 encoding in Data URL payload.") from exc
    return raw[:2_000_000]


_STORAGE_PATH_RE = re.compile(
    r"^(https?://[^\s/$.?#].[^\s]*|[a-zA-Z0-9_\-\.\/]+)$"
)
_RESERVED_DEVICE_NAMES = {"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "LPT1", "LPT2", "LPT3"}


def _validate_storage_file_path(raw: str) -> str:
    if raw.startswith("data:"):
        return _validate_data_url(raw)
    decoded = raw
    for _ in range(3):
        d = unquote(decoded)
        if d == decoded:
            break
        decoded = d
    norm = decoded.replace("\\", "/")
    if ".." in norm or norm.startswith("/") or ":" in norm or "//" in norm or ".." in raw or raw.startswith(("/", "\\")):
        raise ValueError("Invalid file path: path traversal or absolute path detected")
    if not _STORAGE_PATH_RE.match(norm):
        raise ValueError(
            "Invalid file path format. Must be a valid relative path using alphanumeric characters, hyphens, underscores, dots, and slashes."
        )
    parts = [p.upper() for p in norm.split("/")]
    for p in parts:
        if p in _RESERVED_DEVICE_NAMES:
            raise ValueError(f"Invalid file path: reserved device name '{p}' detected")
    cleaned = sanitize_text(raw, max_length=1024)
    return cleaned


class DocumentBase(BaseModel):
    tenant_id: int | None = Field(None, ge=1)
    doc_type: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=255)
    file_path: str | None = Field(None, max_length=1024)
    file_name: str | None = Field(None, max_length=255)
    file_size: int | None = Field(0, ge=0, le=50 * 1024 * 1024)
    reference_type: str | None = Field(None, max_length=64)
    reference_id: int | None = Field(None, ge=1)
    department: str | None = Field("Procurement", max_length=128)
    version: str | None = Field("v1.0", max_length=32)
    description: str | None = Field(None, max_length=4000)
    uploaded_by: str | None = Field(None, max_length=255)

    @field_validator("title", "doc_type", "description", "department", "uploaded_by", "file_name", mode="before")
    @classmethod
    def sanitize_fields(cls, value: Any, info: Any) -> str | None:
        if value is None:
            return None
        s = str(value).strip()
        field_name = info.field_name
        if field_name in ("title", "doc_type"):
            if not s:
                raise ValueError(f"{field_name} cannot be empty or whitespace-only.")
            cleaned = sanitize_text(s, max_length=4000)
            if not cleaned or not cleaned.strip():
                raise ValueError(f"{field_name} cannot be empty after sanitization.")
            return cleaned
        if not s:
            return None
        cleaned = sanitize_text(s, max_length=4000)
        if not cleaned or not cleaned.strip():
            raise ValueError(f"{field_name} cannot be empty after sanitization.")
        return cleaned

    @field_validator("file_path")
    @classmethod
    def sanitize_file_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        raw = str(value).strip()
        return _validate_storage_file_path(raw)


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    doc_type: str | None = Field(None, min_length=1, max_length=64)
    title: str | None = Field(None, min_length=1, max_length=255)
    file_path: str | None = Field(None, max_length=1024)
    file_name: str | None = Field(None, max_length=255)
    file_size: int | None = Field(None, ge=0, le=50 * 1024 * 1024)
    reference_type: str | None = Field(None, max_length=64)
    reference_id: int | None = Field(None, ge=1)
    department: str | None = Field(None, max_length=128)
    version: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=4000)
    uploaded_by: str | None = Field(None, max_length=255)

    @field_validator("title", "doc_type", "description", "department", "uploaded_by", "file_name", mode="before")
    @classmethod
    def sanitize_fields(cls, value: Any, info: Any) -> str | None:
        if value is None:
            return None
        s = str(value).strip()
        if not s:
            raise ValueError(f"{info.field_name} cannot be empty or whitespace-only.")
        cleaned = sanitize_text(s, max_length=4000)
        if not cleaned or not cleaned.strip():
            raise ValueError(f"{info.field_name} cannot be empty after sanitization.")
        return cleaned

    @field_validator("file_path")
    @classmethod
    def sanitize_file_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        raw = str(value).strip()
        return _validate_storage_file_path(raw)


class DocumentRead(DocumentBase):
    id: int
    created_at: object | None = Field(default=None)
    updated_at: object | None = Field(default=None)
    model_config = ConfigDict(from_attributes=True)
