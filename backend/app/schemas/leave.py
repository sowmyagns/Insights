from pydantic import BaseModel
from typing import Optional
from datetime import date


class LeaveBase(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: Optional[str] = "pending"


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    status: Optional[str] = None


class Leave(LeaveBase):
    id: int
    class Config:
        from_attributes = True
