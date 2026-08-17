from pydantic import BaseModel
from typing import Optional


class PayrollBase(BaseModel):
    employee_id: int
    month: str
    basic_salary: float = 0
    allowances: float = 0
    deductions: float = 0


class PayrollCreate(PayrollBase):
    pass


class Payroll(PayrollBase):
    id: int
    net_salary: float = 0
    class Config:
        from_attributes = True