from pydantic import BaseModel
from typing import Optional


class OvertimeSettingBase(BaseModel):
    mode: str  # fixed, gross, basic
    value: Optional[float] = 0
    is_active: Optional[int] = 1


class OvertimeSettingCreate(OvertimeSettingBase):
    pass


class OvertimeSettingUpdate(BaseModel):
    mode: Optional[str] = None
    value: Optional[float] = None
    is_active: Optional[int] = None


class OvertimeSetting(OvertimeSettingBase):
    id: int

    class Config:
        from_attributes = True
