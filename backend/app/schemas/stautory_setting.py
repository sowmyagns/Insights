from pydantic import BaseModel
from typing import Optional, Dict, Any


class StatutorySettingBase(BaseModel):
    setting_type: str  # pf, pt, esic
    data: Optional[Dict[str, Any]] = None
    is_active: Optional[int] = 1


class StatutorySettingCreate(StatutorySettingBase):
    pass


class StatutorySettingUpdate(BaseModel):
    data: Optional[Dict[str, Any]] = None
    is_active: Optional[int] = None


class StatutorySetting(StatutorySettingBase):
    id: int

    class Config:
        from_attributes = True
