from pydantic import BaseModel
from typing import Optional


class EmploymentTypeBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class EmploymentTypeCreate(EmploymentTypeBase):
    pass


class EmploymentTypeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None


class EmploymentType(EmploymentTypeBase):
    id: int

    class Config:
        from_attributes = True
