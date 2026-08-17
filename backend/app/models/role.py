from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id")),
    Column("permission_id", Integer, ForeignKey("permissions.id")),
)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    code = Column(String(30), unique=True)  # admin, hr, employee, manager
    description = Column(String(255))

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(80), unique=True)  # e.g. leave.approve, payroll.view
    module = Column(String(50))  # leave, payroll, attendance, etc.
    description = Column(String(255))

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
