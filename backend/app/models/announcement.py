from sqlalchemy import Column, Integer, String, Date, Text
from app.core.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text)
    publish_date = Column(Date)
    expiry_date = Column(Date)
    is_published = Column(Integer, default=1)
    created_at = Column(Date)  # optional, can use default in API
