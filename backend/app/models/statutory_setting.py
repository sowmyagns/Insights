from sqlalchemy import Column, Integer, String, Text
from app.models.base import Base


class StatutorySetting(Base):
    """Statutory compliance settings (PF, PT, ESIC, etc.)."""
    __tablename__ = "statutory_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_type = Column(String(30), nullable=False)  # pf, pt, esic
    data = Column(Text)  # JSON string
    is_active = Column(Integer, default=1)
