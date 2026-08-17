from sqlalchemy import Column, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmployeeShift(Base):
    """Employee to shift assignment."""
    __tablename__ = "employee_shifts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)  # NULL = ongoing
