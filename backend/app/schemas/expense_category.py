from pydantic import BaseModel
from typing import Optional


class ExpenseCategoryBase(BaseModel):
    name: str
    code: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None


class ExpenseCategory(ExpenseCategoryBase):
    id: int

    class Config:
        from_attributes = True
