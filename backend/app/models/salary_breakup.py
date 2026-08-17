from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class SalaryBreakup(Base):
    __tablename__ = "salary_breakups"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    ctc_annual = Column(Float, default=0)
    effective_from = Column(Date)
    created_by = Column(String(100))
    updated_by = Column(String(100))
    data = Column(Text)  # JSON string for components
    created_at = Column(Date)

    employee = relationship("Employee")
    department = relationship("Department")
