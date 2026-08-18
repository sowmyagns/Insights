from sqlalchemy import Column, Integer, Float, Date, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class OvertimeRecord(Base):
    __tablename__ = "overtime_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    rate_multiplier = Column(Float, default=1.5)
    amount = Column(Float, default=0)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    notes = Column(String(255))

    employee = relationship("Employee", foreign_keys=[employee_id])
