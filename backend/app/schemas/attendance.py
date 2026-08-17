from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    check_in_lat: Optional[str] = None
    check_in_lng: Optional[str] = None
    check_out_lat: Optional[str] = None
    check_out_lng: Optional[str] = None
    status: Optional[str] = "present"


class AttendanceCreate(AttendanceBase):
    pass


class Attendance(AttendanceBase):
    id: int
    class Config:
        from_attributes = True


class CheckInOut(BaseModel):
    employee_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
