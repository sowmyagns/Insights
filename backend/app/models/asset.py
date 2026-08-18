from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("asset_categories.id"))
    name = Column(String(120), nullable=False)
    tag = Column(String(50))  # asset tag/id
    serial_no = Column(String(80))
    status = Column(String(30), default="available")  # available, allocated, retired
    purchase_date = Column(Date)
    cost = Column(Float, default=0)

    category = relationship("AssetCategory")
