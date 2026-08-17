from sqlalchemy import Column, Integer, Float, Date, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(80), nullable=False)  # Travel, Meals, Office, etc.
    date = Column(Date, nullable=False)
    description = Column(String(255))
    receipt_url = Column(String(500))
    status = Column(String(20), default="pending")  # pending, approved, rejected

    employee = relationship("Employee", back_populates="expenses")
