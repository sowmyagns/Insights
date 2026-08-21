from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.models.base import Base


class SalaryComponent(Base):
    __tablename__ = "salary_components"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(30), nullable=False)  # earning, deduction
    calc_type = Column(String(20), nullable=False)  # flat, percent
    calc_value = Column(Float, default=0)
    is_active = Column(Integer, default=1)
    description = Column(String(255))
