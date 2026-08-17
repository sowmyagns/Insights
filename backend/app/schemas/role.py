from pydantic import BaseModel
from typing import Optional, List


class PermissionBase(BaseModel):
    name: str
    code: Optional[str] = None
    module: Optional[str] = None
    description: Optional[str] = None


class Permission(PermissionBase):
    id: int

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None


class Role(RoleBase):
    id: int
    permissions: List[Permission] = []

    class Config:
        from_attributes = True


class RolePermissionsUpdate(BaseModel):
    permission_ids: List[int]
