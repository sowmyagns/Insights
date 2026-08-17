from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class QualityInspectionBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    inspection_number: str
    inspection_date: date
    product_id: int | None = Field(None, ge=1)
    batch_id: int | None = Field(None, ge=1)
    result: str
    inspector: str | None = None
    notes: str | None = None


class QualityInspectionCreate(QualityInspectionBase):
    pass


class QualityInspectionRead(QualityInspectionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DefectBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    defect_code: str
    description: str
    product_id: int | None = Field(None, ge=1)
    batch_id: int | None = Field(None, ge=1)
    quantity_affected: int = Field(1, gt=0)
    severity: str = "medium"
    status: str = "open"
    reported_at: datetime

    @field_validator("quantity_affected", mode="before")
    @classmethod
    def validate_quantity_affected_gt_zero(cls, v: Any) -> int | None:
        if v is not None and v != "":
            val = int(v)
            if val <= 0:
                raise ValueError("quantity_affected must be greater than 0.")
            return val
        return None


class DefectCreate(DefectBase):
    pass


class DefectRead(DefectBase):
    id: int
    resolved_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class BatchQualityReportBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    batch_id: int = Field(..., ge=1)
    report_date: date
    pass_count: int = Field(0, ge=0)
    fail_count: int = Field(0, ge=0)
    summary: str | None = None

    @field_validator("pass_count", "fail_count", mode="before")
    @classmethod
    def validate_counts_not_negative(cls, v: Any, info: Any) -> int | None:
        if v is not None and v != "":
            val = int(v)
            if val < 0:
                raise ValueError(f"{info.field_name} cannot be negative.")
            return val
        return None


class BatchQualityReportCreate(BatchQualityReportBase):
    pass


class BatchQualityReportRead(BatchQualityReportBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ComplianceLogBase(BaseModel):
    tenant_id: int
    log_type: str
    reference: str | None = None
    logged_at: datetime
    description: str | None = None
    status: str = "completed"


class ComplianceLogCreate(ComplianceLogBase):
    pass


class ComplianceLogRead(ComplianceLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
