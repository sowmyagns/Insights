from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class SalaryHold(Base):
    __tablename__ = "salary_holds"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(String(7), nullable=False)  # YYYY-MM
    paid_days = Column(Float, default=0)
    deductions = Column(Float, default=0)
    gross_pay = Column(Float, default=0)
    net_pay = Column(Float, default=0)
    reason = Column(String(255))
    updated_by = Column(String(100))
    updated_at = Column(Date)

    employee = relationship("Employee")
