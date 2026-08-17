from datetime import date, timedelta

from pydantic import BaseModel


class EmployeeSummaryRead(BaseModel):
    total_employees: int = 0
    present_today: int = 0
    absent: int = 0
    on_leave: int = 0
    overtime: float = 0
    departments: int = 0
    contract_employees: int = 0
    new_joiners: int = 0


class EmployeeListRead(BaseModel):
    id: int
    employee_id: str
    employee_code: str | None = None
    full_name: str
    department: str | None = None
    designation: str | None = None
    shift: str | None = None
    reporting_manager: str | None = None
    employment_type: str | None = None
    status: str = "active"
    phone: str | None = None
    email: str | None = None
    joining_date: str | None = None
    salary: float | None = None
    initials: str | None = None
