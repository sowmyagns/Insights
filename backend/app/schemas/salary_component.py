from pydantic import BaseModel
from typing import Optional


class SalaryComponentBase(BaseModel):
    name: str
    category: str  # earning, deduction
    calc_type: str  # flat, percent
    calc_value: Optional[float] = 0
    is_active: Optional[int] = 1
    description: Optional[str] = None


class SalaryComponentCreate(SalaryComponentBase):
    pass


class SalaryComponentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    calc_type: Optional[str] = None
    calc_value: Optional[float] = None
    is_active: Optional[int] = None
    description: Optional[str] = None


class SalaryComponent(SalaryComponentBase):
    id: int

    class Config:
        from_attributes = True
