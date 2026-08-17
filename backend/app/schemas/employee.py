from pydantic import BaseModel
from typing import Optional
from datetime import date


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class Department(DepartmentBase):
    id: int
    class Config:
        from_attributes = True


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    joining_date: Optional[date] = None
    status: Optional[str] = "active"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    joining_date: Optional[date] = None
    status: Optional[str] = None


class Employee(EmployeeBase):
    id: int
    employee_id: Optional[str] = None
    class Config:
        from_attributes = True
