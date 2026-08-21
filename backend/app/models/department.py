from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    code = Column(String(32), nullable=False)
    name = Column(String(255), nullable=False)
    department_type = Column(String(64), nullable=False, default="admin")
    plant = Column(String(128))
    branch = Column(String(128))
    description = Column(Text)
    status = Column(String(32), nullable=False, default="active")
    manager_name = Column(String(255))
    manager_mobile = Column(String(64))
    manager_email = Column(String(255))
    manager_designation = Column(String(128))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    employee_count = Column(Integer, default=0)
    machine_count = Column(Integer, default=0)
    work_center_count = Column(Integer, default=0)
