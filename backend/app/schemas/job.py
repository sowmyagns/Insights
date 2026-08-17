from pydantic import BaseModel
from typing import Optional


class JobBase(BaseModel):
    title: str
    dept: str
    location: str
    applicants: int = 0
    status: str = "Open"
    posted: Optional[str] = None
    description: Optional[str] = None


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    dept: Optional[str] = None
    location: Optional[str] = None
    applicants: Optional[int] = None
    status: Optional[str] = None
    posted: Optional[str] = None
    description: Optional[str] = None


class Job(JobBase):
    id: int
    class Config:
        from_attributes = True
