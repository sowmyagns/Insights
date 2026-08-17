from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class InventorySummaryRead(BaseModel):
    total_items: int = Field(0, ge=0)
    available_stock: int = Field(0, ge=0)
    low_stock: int = Field(0, ge=0)
    out_of_stock: int = Field(0, ge=0)
    stock_value: float = Field(0.0, ge=0.0)
    expiring_soon: int = Field(0, ge=0)
    reorder_items: int = Field(0, ge=0)


class MaterialListRead(BaseModel):
    id: int
    sku: str
    name: str
    category: str | None = None
    warehouse_name: str | None = None
    batch_number: str | None = None
    quantity: int = Field(0, ge=0)
    reserved: int = Field(0, ge=0)
    available: int = Field(0, ge=0)
    unit: str = "pcs"
    reorder_level: int = Field(0, ge=0)
    unit_cost: float | None = Field(None, ge=0.0)
    stock_value: float | None = Field(None, ge=0.0)
    status: str = "available"
    barcode: str | None = None
    vendor_name: str | None = None
    item_type: str = "raw_material"


class FinishedGoodListRead(BaseModel):
    id: int
    sku: str
    name: str
    batch_number: str | None = None
    quantity: int = Field(0, ge=0)
    reserved: int = Field(0, ge=0)
    available: int = Field(0, ge=0)
    warehouse_name: str | None = None
    customer_name: str | None = None
    status: str = "available"
    production_date: str | None = None
    expiry_date: str | None = None
    warranty: str | None = None
    serial_number: str | None = None
    qr_code: str | None = None
    unit_cost: float | None = Field(None, ge=0.0)
    stock_value: float | None = Field(None, ge=0.0)


class MaterialDetailRead(BaseModel):
    id: int
    sku: str
    name: str
    barcode: str | None = None
    category: str | None = None
    unit: str = "pcs"
    unit_cost: float | None = Field(None, ge=0.0)
    reorder_level: int = Field(0, ge=0)
    description: str | None = None
    vendor_name: str | None = None
    vendor_contact: str | None = None
    vendor_email: str | None = None
    stock_history: list[dict] = Field(default_factory=list)
    purchase_history: list[dict] = Field(default_factory=list)
    consumption_history: list[dict] = Field(default_factory=list)
    batches: list[dict] = Field(default_factory=list)


class StockTransferCreate(BaseModel):
    transfer_number: str | None = None
    transfer_date: str | None = None
    from_warehouse_id: int = Field(..., ge=1)
    to_warehouse_id: int = Field(..., ge=1)
    item_id: int = Field(..., ge=1)
    batch_number: str | None = None
    quantity: int = Field(..., ge=1)
    vehicle: str | None = None
    driver: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_warehouses_differ(self) -> "StockTransferCreate":
        if self.from_warehouse_id and self.to_warehouse_id and self.from_warehouse_id == self.to_warehouse_id:
            raise ValueError("Source (from_warehouse_id) and destination (to_warehouse_id) warehouses must be different.")
        return self


VALID_TRANSFER_STATUSES = {"pending", "in_transit", "completed", "cancelled", "approved", "rejected"}
VALID_ADJUSTMENT_STATUSES = {"pending", "approved", "rejected", "completed", "cancelled"}


class StockTransferStatusUpdate(BaseModel):
    status: str
    approved_by: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_transfer_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_TRANSFER_STATUSES:
                raise ValueError(f"Invalid transfer status '{v}'. Must be one of {', '.join(sorted(VALID_TRANSFER_STATUSES))}.")
            return s
        raise ValueError("Transfer status is required.")


class StockTransferRead(BaseModel):
    id: int
    transfer_number: str
    transfer_date: str | None = None
    from_warehouse: str
    to_warehouse: str
    item_name: str
    batch_number: str | None = None
    quantity: int = Field(0, ge=0)
    status: str
    approved_by: str | None = None
    vehicle: str | None = None
    driver: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_transfer_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_TRANSFER_STATUSES:
                raise ValueError(f"Invalid transfer status '{v}'. Must be one of {', '.join(sorted(VALID_TRANSFER_STATUSES))}.")
            return s
        return "pending"


class StockAdjustmentCreate(BaseModel):
    adjustment_date: str | None = None
    warehouse_id: int = Field(..., ge=1)
    item_id: int = Field(..., ge=1)
    new_qty: int = Field(..., ge=0)
    reason: str = Field(..., min_length=1)


class StockAdjustmentStatusUpdate(BaseModel):
    status: str
    approved_by: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_adjustment_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_ADJUSTMENT_STATUSES:
                raise ValueError(f"Invalid adjustment status '{v}'. Must be one of {', '.join(sorted(VALID_ADJUSTMENT_STATUSES))}.")
            return s
        raise ValueError("Adjustment status is required.")


class StockAdjustmentRead(BaseModel):
    id: int
    adjustment_date: str | None = None
    warehouse_name: str
    item_name: str
    old_qty: int = Field(0, ge=0)
    new_qty: int = Field(0, ge=0)
    difference: int = 0
    reason: str
    status: str
    approved_by: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_adjustment_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_ADJUSTMENT_STATUSES:
                raise ValueError(f"Invalid adjustment status '{v}'. Must be one of {', '.join(sorted(VALID_ADJUSTMENT_STATUSES))}.")
            return s
        return "pending"


class LedgerSummaryRead(BaseModel):
    total_transactions: int = Field(0, ge=0)
    stock_in: int = Field(0, ge=0)
    stock_out: int = Field(0, ge=0)
    transfers: int = Field(0, ge=0)
    adjustments: int = Field(0, ge=0)
    current_stock_value: float = Field(0.0, ge=0.0)


class LedgerEntryRead(BaseModel):
    id: int
    date: str | None = None
    transaction: str
    warehouse_name: str
    item_name: str
    batch_number: str | None = None
    qty_in: int = Field(0, ge=0)
    qty_out: int = Field(0, ge=0)
    balance: int = Field(0, ge=0)
    user_name: str | None = None
    reference: str | None = None


class InventoryHubRead(BaseModel):
    total_inventory_value: float = Field(0.0, ge=0.0)
    low_stock_items: int = Field(0, ge=0)
    dead_stock: int = Field(0, ge=0)
    fast_moving: int = Field(0, ge=0)
    slow_moving: int = Field(0, ge=0)
    todays_transactions: int = Field(0, ge=0)
    warehouse_stock: list[dict] = Field(default_factory=list)
    top_materials: list[dict] = Field(default_factory=list)




