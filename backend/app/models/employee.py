from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True)  # EMP001
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    department_id = Column(Integer, ForeignKey("departments.id"))
    designation = Column(String(100))  # Backend Developer, etc.
    salary = Column(Float)
    joining_date = Column(Date)
    status = Column(String(20), default="active")  # active, inactive

    department = relationship("Department", back_populates="employees")
    attendance_records = relationship("Attendance", back_populates="employee")
    leave_records = relationship("Leave", back_populates="employee")
    payroll_records = relationship("Payroll", back_populates="employee")
    overtime_records = relationship("OvertimeRecord", back_populates="employee")
    expenses = relationship("Expense", back_populates="employee")
    site_visits = relationship("SiteVisit", back_populates="employee")
