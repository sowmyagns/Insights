from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    check_in_lat = Column(String(20))
    check_in_lng = Column(String(20))
    check_out_lat = Column(String(20))
    check_out_lng = Column(String(20))
    status = Column(String(20), default="present")  # present, absent, half-day, leave

    employee = relationship("Employee", back_populates="attendance_records")
