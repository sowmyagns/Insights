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

import {
  AccountsCard,
  AccountsPageShell,
  ACCOUNTS_TEXT,
} from "../../components/accounts/accountsDesignSystem";
import { REPORT_CATALOG } from "../../data/reportCatalog";

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
      className="flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-6 text-center shadow-sm transition hover:border-[#6C4CFF]/30 hover:shadow-md"
    >
      <span
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white"
        style={{ background: color || "#64748b" }}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <span className="text-[13px] font-semibold leading-snug" style={{ color: ACCOUNTS_TEXT }}>
        {label}
      </span>
    </button>
  );
}

export default function AccountingReportsV2() {
  const navigate = useNavigate();

  return (
    <AccountsPageShell>
      <div className="mx-auto max-w-[1400px]">
        <AccountsCard>
          <div className="border-b border-[#E2E8F0] px-5 py-4 sm:px-6">
            <h2 className="text-[18px] font-bold" style={{ color: ACCOUNTS_TEXT }}>
              Accounting Reports
            </h2>
            <p className="mt-1 text-[13px] text-[#64748B]">
              Browse and run finance, GST, inventory, and audit reports.
            </p>
          </div>

          <div className="p-5 sm:p-6">
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
        </AccountsCard>
      </div>
    </AccountsPageShell>
  );
}
