from sqlalchemy import Column, Integer, String, Time, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Shift(Base):
    """Shift definitions for 24-hour cycle support."""
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    start_time = Column(String(5), nullable=False)  # HH:MM 24h
    end_time = Column(String(5), nullable=False)   # HH:MM 24h (can span midnight)
    is_night_shift = Column(Integer, default=0)   # 1 if spans midnight
    overtime_rate_multiplier = Column(Integer, default=150)  # e.g. 150 = 1.5x
