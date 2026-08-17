import pytest
from pydantic import ValidationError

from app.schemas.quality_extended import (
    BatchReportRead,
    BatchReportSummaryRead,
    DefectEnrichedRead,
    IncomingInspectionRead,
    InspectionSummaryRead,
    QualityHubRead,
)


def test_quality_hub_read_independent_list_defaults():
    """Each QualityHubRead instance gets its own independent list instances."""
    q1 = QualityHubRead()
    q2 = QualityHubRead()

    assert q1.pass_vs_fail is not q2.pass_vs_fail
    assert q1.defect_trend is not q2.defect_trend
    assert q1.monthly_yield is not q2.monthly_yield
    assert q1.supplier_quality is not q2.supplier_quality
    assert q1.machine_defects is not q2.machine_defects
    assert q1.pareto_defects is not q2.pareto_defects
    assert q1.root_cause_analysis is not q2.root_cause_analysis
    assert q1.defect_by_product is not q2.defect_by_product
    assert q1.qc_performance is not q2.qc_performance
    assert q1.recent_inspections is not q2.recent_inspections
    assert q1.alerts is not q2.alerts

    q1.pass_vs_fail.append({"month": "Jan", "passed": 10, "failed": 1})
    q1.alerts.append({"type": "warning", "message": "High defect rate"})

    assert len(q1.pass_vs_fail) == 1
    assert len(q2.pass_vs_fail) == 0
    assert len(q1.alerts) == 1
    assert len(q2.alerts) == 0


def test_inspection_summary_read_negative_counts_rejected():
    """todays_inspections=-5 or passed=-1 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        InspectionSummaryRead(todays_inspections=-5)
    assert any(err["loc"] == ("todays_inspections",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        InspectionSummaryRead(passed=-1)
    assert any(err["loc"] == ("passed",) for err in exc_info.value.errors())


def test_inspection_summary_read_valid_counts():
    """Zero or positive counts pass validation."""
    summary = InspectionSummaryRead(
        todays_inspections=10,
        pending_inspection=2,
        passed=7,
        failed=1,
        rejected_lots=0,
        avg_inspection_time=12.5,
    )
    assert summary.todays_inspections == 10
    assert summary.passed == 7
    assert summary.avg_inspection_time == 12.5


def test_incoming_inspection_read_negative_quantity_rejected():
    """IncomingInspectionRead(id=1, inspection_number="INS-001", quantity=-10) raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        IncomingInspectionRead(id=1, inspection_number="INS-001", quantity=-10.0)
    assert any(err["loc"] == ("quantity",) for err in exc_info.value.errors())


def test_incoming_inspection_read_valid_quantity():
    """Zero or positive quantity passes validation."""
    insp = IncomingInspectionRead(id=1, inspection_number="INS-001", quantity=50.0)
    assert insp.quantity == 50.0


def test_batch_report_read_negative_quantities_rejected():
    """production_qty=-10, pass_qty=-5, or reject_qty=-2 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        BatchReportRead(id=1, production_qty=-10)
    assert any(err["loc"] == ("production_qty",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        BatchReportRead(id=1, pass_qty=-5)
    assert any(err["loc"] == ("pass_qty",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        BatchReportRead(id=1, reject_qty=-2)
    assert any(err["loc"] == ("reject_qty",) for err in exc_info.value.errors())


def test_batch_report_read_valid_quantities():
    """Zero or positive quantities pass validation."""
    report = BatchReportRead(
        id=1,
        production_qty=100,
        pass_qty=95,
        reject_qty=5,
    )
    assert report.production_qty == 100
    assert report.pass_qty == 95
    assert report.reject_qty == 5


def test_defect_enriched_read_negative_quantity_affected_rejected():
    """DefectEnrichedRead(id=1, defect_code="D001", description="Test", quantity_affected=-5) raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        DefectEnrichedRead(id=1, defect_code="D001", description="Test", quantity_affected=-5)
    assert any(err["loc"] == ("quantity_affected",) for err in exc_info.value.errors())


def test_defect_enriched_read_valid_quantity_affected():
    """Zero or positive quantity_affected passes validation."""
    defect = DefectEnrichedRead(id=1, defect_code="D001", description="Test", quantity_affected=5)
    assert defect.quantity_affected == 5


def test_quality_percentage_fields_out_of_range_rejected():
    """yield_pct=150, scrap_pct=-10, rework_pct=120, or defect_rate=200 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        QualityHubRead(yield_pct=150.0)
    assert any(err["loc"] == ("yield_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        QualityHubRead(defect_rate=200.0)
    assert any(err["loc"] == ("defect_rate",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        BatchReportSummaryRead(scrap_pct=-10.0)
    assert any(err["loc"] == ("scrap_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        BatchReportSummaryRead(rework_pct=120.0)
    assert any(err["loc"] == ("rework_pct",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        BatchReportRead(id=1, yield_pct=150.0)
    assert any(err["loc"] == ("yield_pct",) for err in exc_info.value.errors())


def test_quality_percentage_fields_valid_range():
    """Percentages in [0, 100] pass validation."""
    hub = QualityHubRead(yield_pct=98.5, defect_rate=1.5)
    assert hub.yield_pct == 98.5
    assert hub.defect_rate == 1.5

    summary = BatchReportSummaryRead(yield_pct=95.0, scrap_pct=3.0, rework_pct=2.0)
    assert summary.yield_pct == 95.0
    assert summary.scrap_pct == 3.0
    assert summary.rework_pct == 2.0
