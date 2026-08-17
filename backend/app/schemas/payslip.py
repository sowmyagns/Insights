from pydantic import BaseModel
from typing import Optional
from datetime import date


class PayslipBase(BaseModel):
    employee_id: int
    month: str
    gross_pay: Optional[float] = 0
    deductions: Optional[float] = 0
    net_pay: Optional[float] = 0
    file_url: Optional[str] = None
    generated_on: Optional[date] = None


class PayslipCreate(PayslipBase):
    pass


class PayslipUpdate(BaseModel):
    gross_pay: Optional[float] = None
    deductions: Optional[float] = None
    net_pay: Optional[float] = None
    file_url: Optional[str] = None
    generated_on: Optional[date] = None


class Payslip(PayslipBase):
    id: int

    class Config:
        from_attributes = True
