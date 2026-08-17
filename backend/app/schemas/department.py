from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_DEPARTMENT_STATUSES = {"active", "inactive", "maintenance", "suspended", "archived"}
VALID_DEPARTMENT_TYPES = {
    "production", "quality", "maintenance", "stores", "logistics",
    "hr", "admin", "sales", "finance", "support", "engineering", "toolroom"
}


class DepartmentBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    code: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    department_type: str = "production"
    plant: str | None = None
    branch: str | None = None
    description: str | None = None
    status: str = "active"
    manager_name: str | None = None
    manager_mobile: str | None = None
    manager_email: str | None = None
    manager_designation: str | None = None
    employee_count: int | None = Field(0, ge=0)
    machine_count: int | None = Field(0, ge=0)
    work_center_count: int | None = Field(0, ge=0)
    is_active: bool = True

    @field_validator("code", "name", mode="before")
    @classmethod
    def validate_non_whitespace_identifiers(cls, v: Any, info: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError(f"{info.field_name} cannot be empty or whitespace-only.")
            return s
        raise ValueError(f"{info.field_name} is required.")

    @field_validator("status", mode="before")
    @classmethod
    def validate_dept_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_DEPARTMENT_STATUSES:
                raise ValueError(f"Invalid department status '{v}'.")
            return s
        return "active"

    @field_validator("department_type", mode="before")
    @classmethod
    def validate_dept_type(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_DEPARTMENT_TYPES:
                raise ValueError(f"Invalid department type '{v}'.")
            return s
        return "production"

    @field_validator("manager_email", mode="before")
    @classmethod
    def validate_manager_email(cls, v: Any) -> str | None:
        if v is not None and str(v).strip():
            email = str(v).strip().lower()
            if "@" not in email or email.startswith("@") or email.endswith("@"):
                raise ValueError("Invalid manager email format")
            local, _, domain = email.partition("@")
            if not local or not domain or "." not in domain:
                raise ValueError("Invalid manager email format")
            return email
        return None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1)
    code: str | None = Field(None, min_length=1)
    department_type: str | None = None
    plant: str | None = None
    branch: str | None = None
    description: str | None = None
    status: str | None = None
    manager_name: str | None = None
    manager_mobile: str | None = None
    manager_email: str | None = None
    manager_designation: str | None = None
    employee_count: int | None = Field(None, ge=0)
    machine_count: int | None = Field(None, ge=0)
    work_center_count: int | None = Field(None, ge=0)
    is_active: bool | None = None

    @field_validator("code", "name", mode="before")
    @classmethod
    def validate_non_whitespace_identifiers(cls, v: Any, info: Any) -> str | None:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError(f"{info.field_name} cannot be empty or whitespace-only.")
            return s
        return None

    @field_validator("status", mode="before")
    @classmethod
    def validate_dept_status(cls, v: Any) -> str | None:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_DEPARTMENT_STATUSES:
                raise ValueError(f"Invalid department status '{v}'.")
            return s
        return None

    @field_validator("department_type", mode="before")
    @classmethod
    def validate_dept_type(cls, v: Any) -> str | None:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_DEPARTMENT_TYPES:
                raise ValueError(f"Invalid department type '{v}'.")
            return s
        return None

    @field_validator("manager_email", mode="before")
    @classmethod
    def validate_manager_email(cls, v: Any) -> str | None:
        if v is not None and str(v).strip():
            email = str(v).strip().lower()
            if "@" not in email or email.startswith("@") or email.endswith("@"):
                raise ValueError("Invalid manager email format")
            local, _, domain = email.partition("@")
            if not local or not domain or "." not in domain:
                raise ValueError("Invalid manager email format")
            return email
        return None


class DepartmentListRead(DepartmentBase):
    id: int
    employee_count: int = Field(0, ge=0)
    machine_count: int = Field(0, ge=0)
    work_center_count: int = Field(0, ge=0)
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class DepartmentSummaryRead(BaseModel):
    total_departments: int = Field(0, ge=0)
    active_departments: int = Field(0, ge=0)
    production_departments: int = Field(0, ge=0)
    support_departments: int = Field(0, ge=0)
    total_employees: int = Field(0, ge=0)
    total_machines: int = Field(0, ge=0)


class DepartmentWorkCenterRead(BaseModel):
    name: str
    capacity: str | None = None
    shift: str | None = None
    supervisor: str | None = None


class DepartmentEmployeeRead(BaseModel):
    id: int
    employee_code: str
    full_name: str
    email: str | None = None
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)


class DepartmentMachineRead(BaseModel):
    id: int
    code: str
    name: str
    status: str
    work_center: str | None = None
    model_config = ConfigDict(from_attributes=True)


class DepartmentDetailRead(DepartmentListRead):
    present_today: int = Field(0, ge=0)
    absent_today: int = Field(0, ge=0)
    shift_a_count: int = Field(0, ge=0)
    shift_b_count: int = Field(0, ge=0)
    shift_c_count: int = Field(0, ge=0)
    machines_running: int = Field(0, ge=0)
    machines_idle: int = Field(0, ge=0)
    machines_breakdown: int = Field(0, ge=0)
    machines_maintenance: int = Field(0, ge=0)
    todays_target: int = Field(0, ge=0)
    todays_production: int = Field(0, ge=0)
    pending_work_orders: int = Field(0, ge=0)
    completed_work_orders: int = Field(0, ge=0)
    work_centers: list[DepartmentWorkCenterRead] = Field(default_factory=list)
    employees: list[DepartmentEmployeeRead] = Field(default_factory=list)
    machines: list[DepartmentMachineRead] = Field(default_factory=list)
