"""Fix quality and HR pages to remove demo fallbacks."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src" / "pages"

QUALITY_FIXES = [
    ("quality/InProcessQC.jsx", "PROCESS", "getProcessEnriched", "getProcessSummary", "mergeProcessSummary"),
    ("quality/FinalQC.jsx", "FINAL", "getFinalEnriched", "getFinalSummary", "mergeFinalSummary"),
    ("quality/BatchQualityReports.jsx", "BATCH", "getBatchEnriched", "getBatchSummary", "mergeBatchSummary"),
    ("quality/DefectTracking.jsx", "REJECTION", "getRejectionEnriched", "getRejectionSummary", "mergeRejectionSummary"),
]

for rel, kind, *_ in QUALITY_FIXES:
    path = ROOT / rel
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    src = re.sub(rf"DEMO_{kind}_LIST,\s*", "", src)
    src = re.sub(rf",\s*DEMO_{kind}_LIST", "", src)
    src = src.replace(f"DEMO_{kind}_SUMMARY", f"EMPTY_{kind}_SUMMARY")
    src = re.sub(rf"list = DEMO_{kind}_LIST;", "list = [];", src)
    src = re.sub(rf"setRows\(DEMO_{kind}_LIST\)", "setRows([])", src)
    src = re.sub(rf"setSummary\(DEMO_{kind}_SUMMARY\)", f"setSummary(EMPTY_{kind}_SUMMARY)", src)
    src = re.sub(r"else \{\s*list = \[\];\s*\}", "", src)  # already empty
    # remove else { list = DEMO... } block pattern
    src = re.sub(r"\} else \{\s*list = \[\];\s*\}", "}", src)
    path.write_text(src, encoding="utf-8")
    print("quality:", rel)

# Quality dashboard
qd = ROOT / "quality/QualityDashboard.jsx"
if qd.exists():
    s = qd.read_text(encoding="utf-8")
    s = s.replace("DEMO_QUALITY_HUB", "EMPTY_QUALITY_HUB")
    s = re.sub(r'\s*addToast\("Showing sample quality dashboard data\.", "warning"\);', "", s)
    s = s.replace("hub.kpi_trends || EMPTY_QUALITY_HUB.kpi_trends", "hub.kpi_trends || {}")
    qd.write_text(s, encoding="utf-8")
    print("quality: QualityDashboard.jsx")

qi = ROOT / "quality/QualityInspection.jsx"
if qi.exists():
    s = qi.read_text(encoding="utf-8")
    s = re.sub(r'import \{ DEMO_INCOMING_LIST \}[^\n]+\n', "", s)
    s = re.sub(r"\s*fallbackData=\{DEMO_INCOMING_LIST\}", "", s)
    qi.write_text(s, encoding="utf-8")

cl = ROOT / "quality/ComplianceLogs.jsx"
if cl.exists():
    s = cl.read_text(encoding="utf-8")
    s = re.sub(r"const DEMO_COMPLIANCE_LOGS = \[[\s\S]*?\];\s*\n", "", s)
    s = re.sub(r"\s*fallbackData=\{DEMO_COMPLIANCE_LOGS\}", "", s)
    cl.write_text(s, encoding="utf-8")

# HR pages
HR_MAP = {
    "DEMO_HR_HUB": "EMPTY_HR_HUB",
    "DEMO_ATTENDANCE_DASHBOARD": "EMPTY_ATTENDANCE_DASHBOARD",
    "DEMO_LEAVE_DASHBOARD": "EMPTY_LEAVE_DASHBOARD",
    "DEMO_PAYROLL_DASHBOARD": "EMPTY_PAYROLL_DASHBOARD",
    "DEMO_PERFORMANCE_DASHBOARD": "EMPTY_PERFORMANCE_DASHBOARD",
    "DEMO_RECRUITMENT_DASHBOARD": "EMPTY_RECRUITMENT_DASHBOARD",
    "DEMO_TRAINING_DASHBOARD": "EMPTY_TRAINING_DASHBOARD",
}

for hr_file in (ROOT / "hr").glob("*.jsx"):
    s = hr_file.read_text(encoding="utf-8")
    orig = s
    for old, new in HR_MAP.items():
        s = s.replace(old, new)
    s = re.sub(r'\s*addToast\("Showing sample[^"]*", "warning"\);', "", s)
    s = s.replace(".kpi_trends || EMPTY_", ".kpi_trends || {} || EMPTY_")  # noop fix below
    for new in HR_MAP.values():
        s = s.replace(f"|| {new}.kpi_trends", "|| {}")
        s = s.replace(f"|| {new}.calendar_marks", "|| {}")
        s = s.replace(f"|| {new}.trend_badge", "|| {}")
    if s != orig:
        hr_file.write_text(s, encoding="utf-8")
        print("hr:", hr_file.name)

print("done")
