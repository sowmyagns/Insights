from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import date


class SalaryBreakupBase(BaseModel):
    employee_id: int
    department_id: Optional[int] = None
    ctc_annual: float = 0
    effective_from: date
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[date] = None


class SalaryBreakupCreate(SalaryBreakupBase):
    pass


class SalaryBreakupUpdate(BaseModel):
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    ctc_annual: Optional[float] = None
    effective_from: Optional[date] = None
    updated_by: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class SalaryBreakup(SalaryBreakupBase):
    id: int

    class Config:
        from_attributes = True
