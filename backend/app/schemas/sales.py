from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.utils.gst import validate_gstin


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

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: Any) -> str | None:
        if value is None:
            return None
        val_str = str(value).strip()
        if not val_str:
            return None
        if not val_str.isdigit():
            raise ValueError("Phone field must accept only numeric digits (0-9)")
        if len(val_str) > 15 or len(val_str) < 7:
            raise ValueError("Phone number must be between 7 and 15 numeric digits")
        return val_str

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_gst(cls, value: Any) -> str | None:
        if value is None:
            return None
        val_str = str(value).strip().upper()
        if not val_str:
            return None
        return validate_gstin(val_str)


class CustomerCreate(CustomerBase):
    pass


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

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: Any) -> str | None:
        if value is None:
            return None
        val_str = str(value).strip()
        if not val_str:
            return None
        if not val_str.isdigit():
            raise ValueError("Phone field must accept only numeric digits (0-9)")
        if len(val_str) > 15 or len(val_str) < 7:
            raise ValueError("Phone number must be between 7 and 15 numeric digits")
        return val_str

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_gst(cls, value: Any) -> str | None:
        if value is None:
            return None
        val_str = str(value).strip().upper()
        if not val_str:
            return None
        return validate_gstin(val_str)


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
