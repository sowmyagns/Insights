import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";

import { getReportById } from "../../data/reportCatalog";
import { getReportView } from "../../data/reportViews";
import AuditTrailV2 from "./AuditTrailV2";
import BalanceSheetV2 from "./BalanceSheetV2";
import BulkExportReportV2 from "./BulkExportReportV2";
import ProfitLossV2 from "./ProfitLossV2";
import ReportViewerV2 from "./ReportViewerV2";

const PAGE_BG = "var(--color-bg)";

function toTitle(id = "") {
  return id
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function GenericReportDetail({ reportId }) {
  const report = getReportById(reportId);
  const title = report?.label || toTitle(reportId) || "Report";
  const shortTitle = title.replace(/ Report$/i, "");

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#e4e4ea] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Link
              to="/accounts/reports"
              className="grid h-8 w-8 place-items-center rounded-full text-[#1a1a1f] hover:bg-[#f3f3f6]"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-[18px] font-semibold text-[#1a1a1f]">{title}</h2>
          </div>

          <div className="grid gap-3 rounded-lg border border-[#ececf0] bg-[#f9f9fb] p-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#6b6b76]">From Date</span>
              <div className="flex items-center rounded-lg border border-[#d0d0d8] bg-white px-3">
                <CalendarDays className="mr-2 h-4 w-4 text-[#9a9aa5]" />
                <input type="date" className="w-full py-2.5 text-[13px] outline-none" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#6b6b76]">To Date</span>
              <div className="flex items-center rounded-lg border border-[#d0d0d8] bg-white px-3">
                <CalendarDays className="mr-2 h-4 w-4 text-[#9a9aa5]" />
                <input type="date" className="w-full py-2.5 text-[13px] outline-none" />
              </div>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold text-[#1a1a1f]"
                style={{ background: "#0f6d84" }}
              >
                <FileText className="h-4 w-4" />
                Generate Report
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-[#d0d0d8] bg-white px-4 py-16 text-center text-[13px] text-[#8a8a96]">
            No data available
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetailV2() {
  const { reportId = "" } = useParams();
  const view = getReportView(reportId);

  if (reportId === "balance-sheet" || view?.layout === "balance-sheet") {
    return <BalanceSheetV2 />;
  }

  if (reportId === "profit-loss" || view?.layout === "profit-loss") {
    return <ProfitLossV2 />;
  }

  if (view?.layout === "bulk-export") {
    return <BulkExportReportV2 />;
  }

  if (view?.layout === "audit-trail" || reportId === "audit-trail") {
    return <AuditTrailV2 />;
  }

  if (view) {
    return <ReportViewerV2 reportId={reportId} />;
  }

  return <GenericReportDetail reportId={reportId} />;
}
