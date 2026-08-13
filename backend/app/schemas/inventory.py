from pydantic import BaseModel, ConfigDict, Field, field_validator


class WarehouseBase(BaseModel):
    tenant_id: int
    name: str
    code: str
    capacity: int | None = None
    is_primary: bool = False


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseRead(WarehouseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SupplierBase(BaseModel):
    tenant_id: int
    name: str
    contact: str | None = None
    email: str | None = None
    phone: str | None = None
    outstanding: float | None = 0.0
    approval_status: str = "approved"


class SupplierCreate(SupplierBase):
    pass


class SupplierRead(SupplierBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class InventoryItemBase(BaseModel):
    tenant_id: int
    supplier_id: int | None = None
    sku: str
    barcode: str | None = None
    name: str
    description: str | None = None
    unit: str = "pcs"
    unit_cost: float | None = Field(None, ge=0)
    reorder_level: int = 0
    item_type: str = "raw_material"  # raw_material, finished_good
    category: str | None = None
    warehouse_name: str | None = None
    batch_number: str | None = None
    quantity: int | None = 0
    reserved: int | None = 0
    status: str | None = "in_stock"
    customer_name: str | None = None
    serial_number: str | None = None
    expiry_date: str | None = None
    production_date: str | None = None
    warranty: str | None = None
    is_active: bool = True

    @field_validator("unit_cost", mode="before")
    @classmethod
    def validate_unit_cost_not_negative(cls, v: float | int | str | None) -> float | None:
        if v is not None and v != "":
            val = float(v)
            if val < 0:
                raise ValueError("Purchase Price cannot be negative.")
            return val
        return None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    supplier_id: int | None = None
    sku: str | None = None
    barcode: str | None = None
    name: str | None = None
    description: str | None = None
    unit: str | None = None
    unit_cost: float | None = Field(None, ge=0)
    reorder_level: int | None = None
    item_type: str | None = None
    category: str | None = None
    warehouse_name: str | None = None
    batch_number: str | None = None
    quantity: int | None = None
    reserved: int | None = None
    status: str | None = None
    customer_name: str | None = None
    serial_number: str | None = None
    expiry_date: str | None = None
    production_date: str | None = None
    warranty: str | None = None
    is_active: bool | None = None

    @field_validator("unit_cost", mode="before")
    @classmethod
    def validate_unit_cost_not_negative(cls, v: float | int | str | None) -> float | None:
        if v is not None and v != "":
            val = float(v)
            if val < 0:
                raise ValueError("Purchase Price cannot be negative.")
            return val
        return None


class InventoryItemRead(InventoryItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class StockLevelBase(BaseModel):
    warehouse_id: int
    item_id: int
    quantity: int = 0


class StockLevelCreate(StockLevelBase):
    pass


class StockLevelRead(StockLevelBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class StockMovementBase(BaseModel):
    tenant_id: int
    warehouse_id: int
    item_id: int
    quantity: int
    movement_type: str  # in, out, adjustment, return, scrap, transfer
    reference: str | None = None
    batch_number: str | None = None
    created_by: str | None = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementRead(StockMovementBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
