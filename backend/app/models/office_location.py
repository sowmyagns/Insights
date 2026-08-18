from sqlalchemy import Column, Integer, String, Float
from app.models.base import Base


class OfficeLocation(Base):
    """Office location for geo-fencing check-in/out validation."""
    __tablename__ = "office_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=500)  # Geo-fence radius
    is_default = Column(Integer, default=1)  # 1 = default for check-in
