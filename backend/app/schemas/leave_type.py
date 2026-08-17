from pydantic import BaseModel
from typing import Optional


class LeaveTypeBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    days_per_year: Optional[int] = None
    is_paid: Optional[int] = 1
    color: Optional[str] = None


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    days_per_year: Optional[int] = None
    is_paid: Optional[int] = None
    color: Optional[str] = None


class LeaveType(LeaveTypeBase):
    id: int

    class Config:
        from_attributes = True
