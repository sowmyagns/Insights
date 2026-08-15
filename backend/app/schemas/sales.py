import re
from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.utils.gst import validate_gstin

_EMAIL_RE = re.compile(
    r"^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$"
)


def _optional_text(value: Any) -> str | None:
    if value is None:
        return None
    val_str = str(value).strip()
    return val_str or None


def _require_letter(value: str, field_label: str) -> str:
    if not re.search(r"[A-Za-z]", value):
        raise ValueError(f"{field_label} must contain at least one letter")
    return value


def _validate_email(value: str) -> str:
    if ".." in value:
        raise ValueError("Invalid email format")
    if not _EMAIL_RE.match(value):
        raise ValueError("Invalid email format")
    return value


class CustomerBase(BaseModel):
    tenant_id: int
    name: str
    contact_name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    pincode: str | None = None
    state: str | None = None
    state_code: str | None = None
    gstin: str | None = None
    email: str | None = None
    phone: str | None = None
    customer_code: str | None = None
    credit_limit: float | None = 0.0
    outstanding: float | None = 0.0
    status: str = "active"


def _validate_customer_name(value: Any, *, required: bool) -> str | None:
    if value is None:
        if required:
            raise ValueError("Company Name is required")
        return None
    val_str = str(value).strip()
    if not val_str:
        if required:
            raise ValueError("Company Name is required")
        return None
    if len(val_str) > 100:
        raise ValueError("Company Name cannot exceed 100 characters")
    if not any(c.isalpha() for c in val_str):
        raise ValueError("Company Name must contain at least one letter")
    return val_str


def _validate_customer_phone(value: Any) -> str | None:
    val_str = _optional_text(value)
    if val_str is None:
        return None
    if not val_str.isdigit():
        raise ValueError("Phone field must accept only numeric digits (0-9)")
    if len(val_str) > 15 or len(val_str) < 7:
        raise ValueError("Phone number must be between 7 and 15 numeric digits")
    if val_str[0] not in "6789":
        raise ValueError(
            f"Mobile No. cannot start with {val_str[0]} and must begin with a valid digit (6, 7, 8, or 9)"
        )
    return val_str


def _validate_gstin(value: Any) -> str | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    normalized = raw.upper()
    return validate_gstin(normalized)


class CustomerCreate(CustomerBase):
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value: Any) -> str:
        validated = _validate_customer_name(value, required=True)
        assert validated is not None
        return validated

    @field_validator("contact_name", mode="before")
    @classmethod
    def validate_contact_name(cls, value: Any) -> str | None:
        val_str = _optional_text(value)
        if val_str is None:
            return None
        return _require_letter(val_str, "Contact Person name")

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, value: Any) -> str | None:
        val_str = _optional_text(value)
        if val_str is None:
            return None
        return _validate_email(val_str)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: Any) -> str | None:
        return _validate_customer_phone(value)

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_gst(cls, value: Any) -> str | None:
        return _validate_gstin(value)


class CustomerUpdate(BaseModel):
    name: str | None = None
    contact_name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    pincode: str | None = None
    state: str | None = None
    state_code: str | None = None
    gstin: str | None = None
    email: str | None = None
    phone: str | None = None
    customer_code: str | None = None
    credit_limit: float | None = None
    outstanding: float | None = None
    status: str | None = None

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value: Any) -> str | None:
        return _validate_customer_name(value, required=False)

    @field_validator("contact_name", mode="before")
    @classmethod
    def validate_contact_name(cls, value: Any) -> str | None:
        val_str = _optional_text(value)
        if val_str is None:
            return None
        return _require_letter(val_str, "Contact Person name")

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, value: Any) -> str | None:
        val_str = _optional_text(value)
        if val_str is None:
            return None
        return _validate_email(val_str)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: Any) -> str | None:
        return _validate_customer_phone(value)

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_gst(cls, value: Any) -> str | None:
        return _validate_gstin(value)


class CustomerRead(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class InvoiceItemBase(BaseModel):
    item_description: str
    qty: float
    unit: str = "pcs"
    rate: float
    amount: float


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemRead(InvoiceItemBase):
    id: int
    invoice_id: int
    model_config = ConfigDict(from_attributes=True)


class SalesOrderBase(BaseModel):
    tenant_id: int
    customer_id: int
    order_number: str
    reference_number: str | None = None
    order_date: date
    status: str = "draft"
    total_amount: float = 0
    invoiced: bool = False
    packed: bool = False
    shipped: bool = False


class SalesOrderLineBase(BaseModel):
    product_id: int | None = None
    item_description: str
    quantity: float
    unit: str = "pcs"
    unit_price: float = 0
    line_total: float = 0


class SalesOrderLineCreate(SalesOrderLineBase):
    pass


class SalesOrderLineRead(SalesOrderLineBase):
    id: int
    sales_order_id: int
    model_config = ConfigDict(from_attributes=True)


class SalesOrderCreate(SalesOrderBase):
    line_items: list[SalesOrderLineCreate] = []


class SalesOrderRead(SalesOrderBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SalesOrderListRead(SalesOrderRead):
    customer_name: str | None = None


class InvoiceBase(BaseModel):
    tenant_id: int
    customer_id: int
    sales_order_id: int | None = None
    invoice_number: str
    issue_date: date
    due_date: date | None = None
    subtotal: float = 0
    discount: float = 0
    sgst_pct: float = 0
    cgst_pct: float = 0
    igst_pct: float = 0
    sgst_amount: float = 0
    cgst_amount: float = 0
    igst_amount: float = 0
    round_off: float = 0
    grand_total: float = 0
    amount_paid: float = 0
    status: str = "draft"
    ack_no: str | None = None
    ack_date: date | None = None


class InvoiceCreate(InvoiceBase):
    items: list[InvoiceItemCreate] = []


class InvoiceRead(InvoiceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class InvoiceListRead(InvoiceRead):
    customer_name: str | None = None
    items: list[InvoiceItemRead] = []


class PaymentBase(BaseModel):
    tenant_id: int
    invoice_id: int
    amount: float
    payment_date: date
    method: str = "cash"
    notes: str | None = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    invoice_id: int | None = None
    amount: float | None = None
    payment_date: date | None = None
    method: str | None = None
    notes: str | None = None


class PaymentRead(PaymentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class LeadBase(BaseModel):
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    status: str = "new"
    notes: str | None = None
    sales_executive: str | None = None
    industry: str | None = None
    region: str | None = None
    priority: str = "medium"
    next_followup: date | None = None
    opportunity_value: float | None = None


class LeadCreate(LeadBase):
    """tenant_id is forced from the JWT on the API — optional in the body."""

    tenant_id: int = 0


class LeadRead(LeadBase):
    id: int
    tenant_id: int
    model_config = ConfigDict(from_attributes=True)


class QuotationBase(BaseModel):
    tenant_id: int
    quote_number: str
    customer_id: int | None = None
    lead_id: int | None = None
    customer_name: str | None = None
    quote_date: date
    valid_until: date | None = None
    status: str = "draft"
    total_amount: float = 0
    notes: str | None = None


class QuotationCreate(BaseModel):
    """tenant_id / quote_number are filled by the API when omitted."""

    tenant_id: int = 0
    quote_number: str | None = None
    customer_id: int | None = None
    lead_id: int | None = None
    customer_name: str | None = None
    quote_date: date | None = None
    valid_until: date | None = None
    status: str = "draft"
    total_amount: float = 0
    notes: str | None = None
    sales_person: str | None = None
    discount: float = 0
    meta_json: dict | str | None = None


class QuotationUpdate(BaseModel):
    customer_id: int | None = None
    customer_name: str | None = None
    quote_date: date | None = None
    valid_until: date | None = None
    status: str | None = None
    total_amount: float | None = None
    notes: str | None = None
    sales_person: str | None = None
    discount: float | None = None
    meta_json: dict | str | None = None


class QuotationRead(QuotationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class QuotationConvertRequest(BaseModel):
    """Optional product line when converting a quotation into a sales order."""

    product_id: int | None = None
    item_description: str | None = None
    quantity: float | None = None
    unit: str = "pcs"
    unit_price: float | None = None
