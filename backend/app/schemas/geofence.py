from pydantic import BaseModel
from typing import Optional


class GeofenceBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_meters: Optional[float] = 500
    address: Optional[str] = None
    is_active: Optional[int] = 1


class GeofenceCreate(GeofenceBase):
    pass


class GeofenceUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[float] = None
    address: Optional[str] = None
    is_active: Optional[int] = None


class Geofence(GeofenceBase):
    id: int

    class Config:
        from_attributes = True
