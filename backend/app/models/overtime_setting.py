from sqlalchemy import Column, Integer, String, Float
from app.models.base import Base


class OvertimeSetting(Base):
    __tablename__ = "overtime_settings"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String(20), nullable=False)  # fixed, gross, basic
    value = Column(Float, default=0)
    is_active = Column(Integer, default=1)
