from pydantic import BaseModel
from typing import Optional
from datetime import date


class SalaryHoldBase(BaseModel):
    employee_id: int
    month: str
    paid_days: Optional[float] = 0
    deductions: Optional[float] = 0
    gross_pay: Optional[float] = 0
    net_pay: Optional[float] = 0
    reason: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[date] = None


class SalaryHoldCreate(SalaryHoldBase):
    pass


class SalaryHoldUpdate(BaseModel):
    paid_days: Optional[float] = None
    deductions: Optional[float] = None
    gross_pay: Optional[float] = None
    net_pay: Optional[float] = None
    reason: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[date] = None


class SalaryHold(SalaryHoldBase):
    id: int

    class Config:
        from_attributes = True
