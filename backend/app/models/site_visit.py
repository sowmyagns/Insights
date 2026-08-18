from sqlalchemy import Column, Integer, Float, Date, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class SiteVisit(Base):
    """Sales force site visit tracking with geo-location."""
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    visit_date = Column(Date, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    purpose = Column(String(100))   # Client Meeting, Site Survey, etc.
    visit_type = Column(String(50))  # Sales, Support, Demo
    client_name = Column(String(150))
    notes = Column(String(500))
    photo_url = Column(String(500))
    document_url = Column(String(500))

    employee = relationship("Employee", foreign_keys=[employee_id])
