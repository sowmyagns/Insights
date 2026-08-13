import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileBarChart2,
  FileBox,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";

import { REPORT_CATALOG } from "../../data/reportCatalog";

const PAGE_BG = "var(--color-bg)";

const REPORT_CARDS = [
  { id: "product-wise-sales", icon: ClipboardList },
  { id: "product-wise-purchase", icon: Package },
  { id: "party-wise-sales", icon: Users },
  { id: "party-wise-purchase", icon: Users },
  { id: "gst-sales", icon: Receipt },
  { id: "gst-purchase", icon: Receipt },
  { id: "gstr-1", icon: FileText },
  { id: "gstr-2", icon: FileText },
  { id: "hsn-sales", icon: FileSpreadsheet },
  { id: "delivery-challan", icon: Truck },
  { id: "bulk-export", icon: FileBox },
  { id: "invoice-details", icon: FileBarChart2 },
  { id: "purchase-details", icon: FileBarChart2 },
  { id: "tds-payable", icon: Receipt },
  { id: "tds-receivable", icon: Receipt },
  { id: "current-stock", icon: Package },
  { id: "delivery-challan-details", icon: Truck },
  { id: "audit-trail", icon: ShieldCheck },
  { id: "balance-sheet", icon: Scale },
  { id: "profit-loss", icon: IndianRupee },
];

function ReportCard({ label, icon: Icon, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center ui-card px-4 py-6 text-center transition hover:border-[var(--color-border-strong)]"
    >
      <span
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white"
        style={{ background: color || "#64748b" }}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <span className="text-[13px] font-semibold leading-snug text-[#1a1a1f]">{label}</span>
    </button>
  );
}

export default function AccountingReportsV2() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <p className="mb-1 ui-eyebrow">Finance</p>
        <h2 className="mb-5 text-[22px] font-semibold tracking-tight text-[#1a1a1f]">
          Accounting Reports
        </h2>

        <div className="rounded-xl border border-[#d0d0d8] bg-white p-6 shadow-sm">
          <div className="mb-5 flex justify-center">
            <div
              className="rounded-lg px-10 py-2 text-[24px] font-bold text-white"
              style={{ background: "#0f6d84" }}
            >
              Reports
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {REPORT_CARDS.map((card) => {
              const meta = REPORT_CATALOG.find((r) => r.id === card.id);
              if (!meta) return null;
              return (
                <ReportCard
                  key={card.id}
                  label={meta.label}
                  icon={card.icon}
                  color={meta.color}
                  onClick={() => navigate(`/accounts/reports/${card.id}`)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
