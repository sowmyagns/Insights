"""Strip demo business data from hrMasterData.js and qualityMasterData.js."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src" / "data"

EMPTY_INCOMING = """export const EMPTY_INCOMING_SUMMARY = {
  total: 0, approved: 0, rejected: 0, in_progress: 0, todays_inspections: 0,
  pending_inspection: 0, passed: 0, failed: 0, rejected_lots: 0, avg_inspection_time: 0,
};
export const DEMO_INCOMING_SUMMARY = EMPTY_INCOMING_SUMMARY;
export const DEMO_INCOMING_LIST = [];"""

EMPTY_PROCESS = """export const EMPTY_PROCESS_SUMMARY = {
  total: 0, passed: 0, failed: 0, in_progress: 0, todays_checks: 0,
  production_running: 0, qc_pending: 0, rework: 0, scrap: 0,
};
export const DEMO_PROCESS_SUMMARY = EMPTY_PROCESS_SUMMARY;
export const DEMO_PROCESS_LIST = [];"""

EMPTY_FINAL = """export const EMPTY_FINAL_SUMMARY = {
  total: 0, passed: 0, failed: 0, in_progress: 0, todays_checks: 0,
  production_running: 0, qc_pending: 0, rework: 0, scrap: 0,
};
export const DEMO_FINAL_SUMMARY = EMPTY_FINAL_SUMMARY;
export const DEMO_FINAL_LIST = [];"""

EMPTY_BATCH = """export const EMPTY_BATCH_SUMMARY = {
  total_batches: 0, passed: 0, failed: 0, in_progress: 0, overall_pass_rate: 0,
  total_trend_pct: 0, pass_rate_trend_pct: 0,
};
export const DEMO_BATCH_SUMMARY = EMPTY_BATCH_SUMMARY;
export const DEMO_BATCH_LIST = [];"""

EMPTY_REJECTION = """export const EMPTY_REJECTION_SUMMARY = {
  total: 0, open: 0, closed: 0, total_quantity: 0, rejection_rate: 0,
  total_trend_pct: 0, total_trend_dir: "flat", rate_trend_pct: 0, rate_trend_dir: "flat",
};
export const DEMO_REJECTION_SUMMARY = EMPTY_REJECTION_SUMMARY;
export const DEMO_REJECTION_LIST = [];"""

EMPTY_QUALITY_HUB = """export const EMPTY_QUALITY_HUB = {
  total_inspections: 0, passed: 0, failed: 0, rejected: 0, in_process: 0,
  pass_rate: 0, yield_pct: 0, defect_rate: 0, kpi_trends: {},
  pass_vs_fail: [], defect_trend: [], monthly_yield: [], supplier_quality: [],
  machine_defects: [], pareto_defects: [], root_cause_analysis: [], qc_performance: [],
  inspection_trend: [], inspection_by_type: [], rejection_reasons: [],
  recent_inspections: [], alerts: [],
};
export const DEMO_QUALITY_HUB = EMPTY_QUALITY_HUB;"""


def strip_quality(path: Path) -> None:
    src = path.read_text(encoding="utf-8")
    src = re.sub(
        r"export const DEMO_INCOMING_SUMMARY = \{[\s\S]*?export const DEMO_INCOMING_LIST = buildDemoIncomingList\(\);",
        EMPTY_INCOMING,
        src,
        count=1,
    )
    src = re.sub(
        r"export const DEMO_PROCESS_SUMMARY = \{[\s\S]*?export const DEMO_PROCESS_LIST = buildDemoProcessList\(\);",
        EMPTY_PROCESS,
        src,
        count=1,
    )
    src = re.sub(
        r"export const DEMO_FINAL_SUMMARY = \{[\s\S]*?export const DEMO_FINAL_LIST = buildDemoFinalList\(\);",
        EMPTY_FINAL,
        src,
        count=1,
    )
    src = re.sub(
        r"export const DEMO_BATCH_SUMMARY = \{[\s\S]*?export const DEMO_BATCH_LIST = buildDemoBatchList\(\);",
        EMPTY_BATCH,
        src,
        count=1,
    )
    src = re.sub(
        r"export const DEMO_REJECTION_SUMMARY = \{[\s\S]*?export const DEMO_REJECTION_LIST = buildDemoRejectionList\(\);",
        EMPTY_REJECTION,
        src,
        count=1,
    )
    src = re.sub(
        r"export const DEMO_QUALITY_HUB = \{[\s\S]*?\n\};\n\nconst TYPE_LABELS",
        EMPTY_QUALITY_HUB + "\n\nconst TYPE_LABELS",
        src,
        count=1,
    )

    # merge functions: no demo fallback
    src = src.replace(
        "if (total === 0 && !apiSummary.passed && !apiSummary.todays_inspections) {\n    return { ...DEMO_INCOMING_SUMMARY };\n  }",
        "if (total === 0 && !apiSummary.passed && !apiSummary.todays_inspections) {\n    return { ...EMPTY_INCOMING_SUMMARY };\n  }",
    )
    src = re.sub(
        r"\|\| DEMO_INCOMING_SUMMARY\.\w+",
        lambda m: " || 0",
        src,
    )
    src = src.replace("return { ...DEMO_PROCESS_SUMMARY };", "return { ...EMPTY_PROCESS_SUMMARY };")
    src = src.replace("return { ...DEMO_FINAL_SUMMARY };", "return { ...EMPTY_FINAL_SUMMARY };")
    src = src.replace("return { ...DEMO_BATCH_SUMMARY };", "return { ...EMPTY_BATCH_SUMMARY };")
    src = src.replace("return { ...DEMO_REJECTION_SUMMARY };", "return { ...EMPTY_REJECTION_SUMMARY };")
    src = re.sub(r"\|\| DEMO_\w+_SUMMARY\.\w+", " || 0", src)
    src = re.sub(r"\?\? DEMO_\w+_SUMMARY\.\w+", " ?? 0", src)

    src = src.replace(
        "export function mergeQualityHub(api = {}) {\n  const total = Number(api.total_inspections) || 0;\n  if (total <= 0) return { ...DEMO_QUALITY_HUB };",
        "export function mergeQualityHub(api = {}) {\n  const total = Number(api.total_inspections) || 0;\n  if (total <= 0) return { ...EMPTY_QUALITY_HUB };",
    )
    src = src.replace("...DEMO_QUALITY_HUB,", "...EMPTY_QUALITY_HUB,")
    src = re.sub(
        r": DEMO_QUALITY_HUB\.\w+",
        ": []",
        src,
    )
    src = src.replace(
        "recent_inspections: (api.recent_inspections || []).length\n      ? api.recent_inspections.map(mapRecentInspection)\n      : []",
        "recent_inspections: (api.recent_inspections || []).map(mapRecentInspection)",
    )

    path.write_text(src, encoding="utf-8")
    print("stripped qualityMasterData.js")


def empty_dashboard(name: str, fields: str) -> str:
    return f"export const EMPTY_{name} = {{{fields}}};\nexport const DEMO_{name} = EMPTY_{name};"


def strip_hr(path: Path) -> None:
    src = path.read_text(encoding="utf-8")

    # Replace large dashboard objects with empty shells
    dashboards = {
        "ATTENDANCE_DASHBOARD": """
  total_employees: 0, present_today: 0, on_leave: 0, late_today: 0, absent_today: 0,
  kpi_trends: {}, summary_slices: [], attendance_pct: 0, today_overview: [], records: [], calendar_marks: {},
""",
        "LEAVE_DASHBOARD": """
  total_employees: 0, leaves_taken: 0, on_leave_today: 0, pending_requests: 0, rejected_requests: 0,
  date_range_label: "", kpi_trends: {}, status_slices: [], leave_balances: [], upcoming_holidays: [],
  total_holidays: 0, total_requests: 0, requests: [],
""",
        "PERFORMANCE_DASHBOARD": """
  total_employees: 0, reviews_completed: 0, reviews_in_progress: 0, average_rating: 0, goals_achieved_pct: 0,
  quarter_label: "", date_range_label: "", trend_badge: {}, performance_trend: [], rating_total: 0,
  kpi_trends: {}, rating_slices: [], top_performers: [], performance_insights: [], upcoming_reviews: [],
  recent_feedback: [], overview_rows: [], total_overview: 0, total_reviews: 0, recent_reviews: [],
""",
        "RECRUITMENT_DASHBOARD": """
  open_positions: 0, total_applicants: 0, interviews_scheduled: 0, offers_extended: 0, hires_mtd: 0,
  kpi_trends: {}, funnel: [], jobs: [], applicants: [], source_slices: [], source_total: 0,
""",
        "TRAINING_DASHBOARD": """
  total_programs: 0, in_progress: 0, completed: 0, not_started: 0, certifications_earned: 0,
  kpi_trends: {}, overview_slices: [], overview_total: 0, completion_trend: [], top_categories: [],
  ongoing_programs: [], total_ongoing: 0, upcoming_programs: [], my_summary: [], recent_certifications: [],
""",
        "PAYROLL_DASHBOARD": """
  total_employees: 0, total_payroll: 0, net_pay: 0, deductions: 0, pending_approval: 0, period_label: "",
  kpi_trends: {}, summary_slices: [], payroll_runs: [], recent_payslips: [], important_dates: [], quick_links: [],
""",
        "HR_HUB": """
  total_employees: 0, present_today: 0, total_for_present: 0, leave_requests: 0, pending_tasks: 0,
  kpi_trends: {}, attendance_week: [], departments: [], upcoming_birthdays: [], recent_joins: [],
  leave_requests_list: [], hr_notice: "", department_strength: [], shift_utilization: [], alerts: [],
""",
    }

    for key, body in dashboards.items():
        pat = rf"export const DEMO_{key} = \{{[\s\S]*?\n\}};"
        repl = empty_dashboard(key, body.strip())
        src = re.sub(pat, repl, src, count=1)

    # Fix merge functions - return empty dashboard instead of demo when no data
    src = src.replace("return { ...DEMO_ATTENDANCE_DASHBOARD };", "return { ...EMPTY_ATTENDANCE_DASHBOARD };")
    src = src.replace("return { ...DEMO_LEAVE_DASHBOARD };", "return { ...EMPTY_LEAVE_DASHBOARD };")
    src = src.replace("return { ...DEMO_PERFORMANCE_DASHBOARD };", "return { ...EMPTY_PERFORMANCE_DASHBOARD };")
    src = src.replace("return { ...DEMO_RECRUITMENT_DASHBOARD };", "return { ...EMPTY_RECRUITMENT_DASHBOARD };")
    src = src.replace("return { ...DEMO_TRAINING_DASHBOARD };", "return { ...EMPTY_TRAINING_DASHBOARD };")
    src = src.replace("return { ...DEMO_PAYROLL_DASHBOARD };", "return { ...EMPTY_PAYROLL_DASHBOARD };")
    src = src.replace("if (total <= 0) return { ...DEMO_HR_HUB };", "if (total <= 0) return { ...EMPTY_HR_HUB };")

    src = src.replace("...DEMO_ATTENDANCE_DASHBOARD,", "...EMPTY_ATTENDANCE_DASHBOARD,")
    src = src.replace("...DEMO_LEAVE_DASHBOARD,", "...EMPTY_LEAVE_DASHBOARD,")
    src = src.replace("...DEMO_PERFORMANCE_DASHBOARD,", "...EMPTY_PERFORMANCE_DASHBOARD,")
    src = src.replace("...DEMO_RECRUITMENT_DASHBOARD,", "...EMPTY_RECRUITMENT_DASHBOARD,")
    src = src.replace("...DEMO_TRAINING_DASHBOARD,", "...EMPTY_TRAINING_DASHBOARD,")
    src = src.replace("...DEMO_PAYROLL_DASHBOARD,", "...EMPTY_PAYROLL_DASHBOARD,")
    src = src.replace("...DEMO_HR_HUB,", "...EMPTY_HR_HUB,")

    # Remove demo fallbacks in merge return fields
    src = re.sub(r"\|\| DEMO_\w+\.\w+", " || 0", src)
    src = re.sub(r"\? mappedRows : DEMO_\w+\.\w+", "? mappedRows : []", src)
    src = re.sub(r": mapped\.length \? mapped : DEMO_\w+\.\w+", ": mapped", src)
    src = re.sub(r"mappedPayslips\.length \? mappedPayslips\.slice\(0, 8\) : DEMO_\w+\.\w+", "mappedPayslips.slice(0, 8)", src)
    src = re.sub(r"topPerformers\.length \? topPerformers : DEMO_\w+\.\w+", "topPerformers", src)
    src = re.sub(r"recentReviews\.length \? recentReviews : DEMO_\w+\.\w+", "recentReviews", src)
    src = re.sub(r"recentFeedback\.length \? recentFeedback : DEMO_\w+\.\w+", "recentFeedback", src)
    src = re.sub(r"departments\.length \? departments : DEMO_\w+\.\w+", "departments", src)
    src = re.sub(r"api\.\w+\?\.length \? api\.\w+ : DEMO_\w+\.\w+", lambda m: m.group(0).split("?")[0].strip() + " || []", src)
    src = re.sub(
        r"slices\.length \? slices : DEMO_\w+\.\w+",
        "slices",
        src,
    )
    src = re.sub(
        r"attendancePct \|\| DEMO_\w+\.\w+",
        "attendancePct",
        src,
    )
    src = re.sub(r"\.\.\.DEMO_LEAVE_DASHBOARD\.leave_balances\.slice\(3\)", "", src)
    src = re.sub(r"Number\(summary\.\w+\) \|\| DEMO_\w+\.leave_balances\[\d+\]\.used", "Number(summary.earned_leave) || 0", src)

    src = src.replace("/** HR demo data and helpers. */", "/** HR helpers and empty dashboard shells. */")

    path.write_text(src, encoding="utf-8")
    print("stripped hrMasterData.js")


if __name__ == "__main__":
    strip_quality(ROOT / "qualityMasterData.js")
    strip_hr(ROOT / "hrMasterData.js")
