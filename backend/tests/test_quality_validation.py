from datetime import date, datetime

import pytest
from pydantic import ValidationError

from app.schemas.quality import BatchQualityReportCreate, DefectCreate


def test_defect_create_zero_or_negative_quantity_affected_rejected():
    """quantity_affected=0 or quantity_affected=-5 raises ValidationError."""
    for qty in [0, -5, -1]:
        with pytest.raises(ValidationError) as exc_info:
            DefectCreate(
                tenant_id=1,
                defect_code="D001",
                description="Surface defect",
                quantity_affected=qty,
                reported_at=datetime.now(),
            )
        assert any(err["loc"] == ("quantity_affected",) for err in exc_info.value.errors())


def test_defect_create_valid_quantity_affected():
    """Positive quantity_affected passes validation."""
    defect = DefectCreate(
        tenant_id=1,
        defect_code="D001",
        description="Surface defect",
        quantity_affected=5,
        reported_at=datetime.now(),
    )
    assert defect.quantity_affected == 5


def test_batch_quality_report_create_negative_pass_count_rejected():
    """pass_count=-5 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        BatchQualityReportCreate(
            tenant_id=1,
            batch_id=1,
            report_date=date.today(),
            pass_count=-5,
        )
    assert any(err["loc"] == ("pass_count",) for err in exc_info.value.errors())


def test_batch_quality_report_create_negative_fail_count_rejected():
    """fail_count=-2 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        BatchQualityReportCreate(
            tenant_id=1,
            batch_id=1,
            report_date=date.today(),
            fail_count=-2,
        )
    assert any(err["loc"] == ("fail_count",) for err in exc_info.value.errors())


def test_batch_quality_report_create_valid_counts():
    """Zero or positive pass_count and fail_count pass validation."""
    report = BatchQualityReportCreate(
        tenant_id=1,
        batch_id=1,
        report_date=date.today(),
        pass_count=50,
        fail_count=2,
    )
    assert report.pass_count == 50
    assert report.fail_count == 2
