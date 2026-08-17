from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.gst import validate_gstin

VALID_COUNTRIES = {
    "INDIA", "UNITED STATES", "USA", "UNITED KINGDOM", "UK", "UNITED ARAB EMIRATES", "UAE",
    "SINGAPORE", "GERMANY", "JAPAN", "CHINA", "AUSTRALIA", "CANADA"
}


class DispatchAddressCreate(BaseModel):
    gstin: str | None = None
    name: str = Field(..., min_length=1)
    address: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "INDIA"
    is_default: bool = False

    @field_validator("name", mode="before")
    @classmethod
    def validate_non_whitespace_name(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("Address name cannot be empty or whitespace-only.")
            return s
        raise ValueError("Address name is required.")

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_dispatch_gstin(cls, v: Any) -> str | None:
        if v is not None and str(v).strip():
            return validate_gstin(v, required=False)
        return None

    @field_validator("pincode", mode="before")
    @classmethod
    def validate_pincode_format(cls, v: Any) -> str | None:
        if v is not None and str(v).strip():
            s = str(v).strip()
            if len(s) != 6 or not s.isdigit() or s.startswith("0"):
                raise ValueError("Pincode must be a valid 6-digit Indian postal code.")
            return s
        return None

    @field_validator("country", mode="before")
    @classmethod
    def validate_country(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().upper()
            if not s or s not in VALID_COUNTRIES:
                raise ValueError(f"Invalid or unsupported country '{v}'.")
            return s
        return "INDIA"


class DispatchAddressUpdate(BaseModel):
    gstin: str | None = None
    name: str | None = Field(None, min_length=1)
    address: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    is_default: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def validate_non_whitespace_name(cls, v: Any) -> str | None:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("Address name cannot be empty or whitespace-only.")
            return s
        return None

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_dispatch_gstin(cls, v: Any) -> str | None:
        if v is not None and str(v).strip():
            return validate_gstin(v, required=False)
        return None

    @field_validator("pincode", mode="before")
    @classmethod
    def validate_pincode_format(cls, v: Any) -> str | None:
        if v is not None and str(v).strip():
            s = str(v).strip()
            if len(s) != 6 or not s.isdigit() or s.startswith("0"):
                raise ValueError("Pincode must be a valid 6-digit Indian postal code.")
            return s
        return None

    @field_validator("country", mode="before")
    @classmethod
    def validate_country(cls, v: Any) -> str | None:
        if v is not None:
            s = str(v).strip().upper()
            if not s or s not in VALID_COUNTRIES:
                raise ValueError(f"Invalid or unsupported country '{v}'.")
            return s
        return None


class DispatchAddressRead(BaseModel):
    id: int
    tenant_id: int
    gstin: str | None = None
    name: str
    address: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "INDIA"
    is_default: bool = False
    model_config = ConfigDict(from_attributes=True)
