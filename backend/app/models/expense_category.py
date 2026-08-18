from sqlalchemy import Column, Integer, String
from app.models.base import Base


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    code = Column(String(30))
    icon = Column(String(50))  # icon name for UI
    description = Column(String(255))
