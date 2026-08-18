from sqlalchemy import Column, Integer, String, Float
from app.models.base import Base


class Geofence(Base):
    __tablename__ = "geofences"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=500)
    address = Column(String(255))
    is_active = Column(Integer, default=1)
