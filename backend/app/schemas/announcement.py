from pydantic import BaseModel
from typing import Optional
from datetime import date


class AnnouncementBase(BaseModel):
    title: str
    body: Optional[str] = None
    publish_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_published: Optional[int] = 1


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    publish_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_published: Optional[int] = None


class Announcement(AnnouncementBase):
    id: int
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[date] = None
    updated_at: Optional[date] = None

    class Config:
        from_attributes = True
