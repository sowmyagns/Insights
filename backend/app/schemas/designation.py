from pydantic import BaseModel
from typing import Optional


class DesignationBase(BaseModel):
    name: str
    description: Optional[str] = None


class DesignationCreate(DesignationBase):
    pass


class DesignationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Designation(DesignationBase):
    id: int

    class Config:
        from_attributes = True
