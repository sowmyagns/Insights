from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(String(7), nullable=False)  # 2026-02
    basic_salary = Column(Float, default=0)
    allowances = Column(Float, default=0)
    deductions = Column(Float, default=0)
    net_salary = Column(Float, default=0)

    employee = relationship("Employee", back_populates="payroll_records")
