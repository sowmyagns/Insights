from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text
from app.models.base import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text)
    publish_date = Column(Date)
    expiry_date = Column(Date)
    is_published = Column(Integer, default=1)
    created_by = Column(String(255))
    updated_by = Column(String(255))
    created_at = Column(Date)
    updated_at = Column(Date)
