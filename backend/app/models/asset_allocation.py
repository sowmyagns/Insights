from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class AssetAllocation(Base):
    __tablename__ = "asset_allocations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    allocated_on = Column(Date)
    returned_on = Column(Date)
    status = Column(String(30), default="allocated")  # allocated, returned
    notes = Column(String(255))

    asset = relationship("Asset")
    employee = relationship("Employee")
