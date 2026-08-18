from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class EmployeeListRead(BaseModel):
    id: int
    employee_id: Optional[str] = None
    employee_code: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    shift: Optional[str] = None
    reporting_manager: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    joining_date: Optional[str] = None
    salary: Optional[float] = None
    initials: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeSummaryRead(BaseModel):
    total_employees: int = 0
    present_today: int = 0
    absent: int = 0
    on_leave: int = 0
    overtime: float = 0.0
    departments: int = 0
    contract_employees: int = 0
    new_joiners: int = 0
