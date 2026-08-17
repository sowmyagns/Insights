from pydantic import BaseModel
from typing import Optional
from datetime import date


class AssetCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class AssetCategoryCreate(AssetCategoryBase):
    pass


class AssetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AssetCategory(AssetCategoryBase):
    id: int

    class Config:
        from_attributes = True


class AssetBase(BaseModel):
    category_id: Optional[int] = None
    name: str
    tag: Optional[str] = None
    serial_no: Optional[str] = None
    status: Optional[str] = "available"
    purchase_date: Optional[date] = None
    cost: Optional[float] = 0


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    tag: Optional[str] = None
    serial_no: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[date] = None
    cost: Optional[float] = None


class Asset(AssetBase):
    id: int

    class Config:
        from_attributes = True


class AssetAllocationBase(BaseModel):
    asset_id: int
    employee_id: int
    allocated_on: Optional[date] = None
    returned_on: Optional[date] = None
    status: Optional[str] = "allocated"
    notes: Optional[str] = None


class AssetAllocationCreate(AssetAllocationBase):
    pass


class AssetAllocationUpdate(BaseModel):
    returned_on: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AssetAllocation(AssetAllocationBase):
    id: int

    class Config:
        from_attributes = True

