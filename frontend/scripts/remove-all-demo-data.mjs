/**
 * Remove all demo/mock business data from frontend.
 * Run: node frontend/scripts/remove-all-demo-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../src");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(jsx|js)$/.test(name)) acc.push(p);
  }
  return acc;
}

function writeIfChanged(filePath, content) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (prev !== content) {
    fs.writeFileSync(filePath, content);
    console.log("updated:", path.relative(srcRoot, filePath));
    return true;
  }
  return false;
}

// --- Inventory: remove MOCKUP blocks and use empty arrays / zero summaries ---
const inventoryFiles = [
  "pages/inventory/RawMaterials.jsx",
  "pages/inventory/FinishedGoods.jsx",
  "pages/inventory/Warehouses.jsx",
  "pages/inventory/StockLedger.jsx",
  "pages/inventory/StockTransfer.jsx",
  "pages/inventory/StockAdjustment.jsx",
  "pages/inventory/InventoryDashboard.jsx",
];

for (const rel of inventoryFiles) {
  const fp = path.join(srcRoot, rel);
  if (!fs.existsSync(fp)) continue;
  let src = fs.readFileSync(fp, "utf8");
  const orig = src;

  // Remove /** Preview ... */ const MOCKUP_* = [...]; blocks (multiline arrays/objects)
  src = src.replace(
    /\/\*\*[^*]*(?:mockup|preview|Preview)[^*]*\*\/\s*\nconst MOCKUP[\w]*\s*=\s*(?:\[[\s\S]*?\]|{[\s\S]*?});?\s*\n/g,
    ""
  );
  src = src.replace(/\nconst MOCKUP[\w]*\s*=\s*(?:\[[\s\S]*?\]|{[\s\S]*?});?\s*\n/g, (m) => {
    if (m.includes("PET Resin") || m.includes("MOCKUP")) return "\n";
    return m;
  });

  // Fallback returns
  src = src.replace(/return MOCKUP_\w+\.map\([^)]+\)/g, "return []");
  src = src.replace(/return MOCKUP_\w+;/g, "return [];");
  src = src.replace(/if \(!hasLiveData\) return MOCKUP_\w+;/g, "if (!hasLiveData) return { total_items: 0, total_value: 0, low_stock: 0, out_of_stock: 0, categories: 0, warehouses: 0 };");
  src = src.replace(/\.\.\.MOCKUP,/g, "");
  src = src.replace(/movements: MOCKUP\.movements\.map\([^)]+\)/g, "movements: []");
  src = src.replace(/lowStockItems: MOCKUP\.lowStockItems\.map\([^)]+\)/g, "lowStockItems: []");

  // displayData fallback spread
  src = src.replace(
    /:\s*\{\s*\.\.\.MOCKUP[\s\S]*?\}/g,
    ": { total_items: 0, total_value: 0, movements: [], lowStockItems: [], kpis: {} }"
  );

  if (src !== orig) writeIfChanged(fp, src);
}

// --- Quality pages: remove DEMO list fallbacks ---
const qualityPages = [
  "pages/quality/IncomingInspection.jsx",
  "pages/quality/InProcessQC.jsx",
  "pages/quality/FinalQC.jsx",
  "pages/quality/BatchQualityReports.jsx",
  "pages/quality/DefectTracking.jsx",
  "pages/quality/QualityDashboard.jsx",
];

const emptySummaryImports = {
  IncomingInspection: "EMPTY_INCOMING_SUMMARY",
  InProcessQC: "EMPTY_PROCESS_SUMMARY",
  FinalQC: "EMPTY_FINAL_SUMMARY",
  BatchQualityReports: "EMPTY_BATCH_SUMMARY",
  DefectTracking: "EMPTY_REJECTION_SUMMARY",
};

for (const rel of qualityPages) {
  const fp = path.join(srcRoot, rel);
  if (!fs.existsSync(fp)) continue;
  let src = fs.readFileSync(fp, "utf8");
  const orig = src;

  src = src.replace(/DEMO_\w+_LIST,\s*/g, "");
  src = src.replace(/,\s*DEMO_\w+_LIST/g, "");
  src = src.replace(/DEMO_\w+_SUMMARY/g, (m) => {
    const map = {
      DEMO_INCOMING_SUMMARY: "EMPTY_INCOMING_SUMMARY",
      DEMO_PROCESS_SUMMARY: "EMPTY_PROCESS_SUMMARY",
      DEMO_FINAL_SUMMARY: "EMPTY_FINAL_SUMMARY",
      DEMO_BATCH_SUMMARY: "EMPTY_BATCH_SUMMARY",
      DEMO_REJECTION_SUMMARY: "EMPTY_REJECTION_SUMMARY",
      DEMO_QUALITY_HUB: "EMPTY_QUALITY_HUB",
    };
    return map[m] || m;
  });
  src = src.replace(/DEMO_QUALITY_HUB/g, "EMPTY_QUALITY_HUB");

  src = src.replace(/list = DEMO_\w+_LIST;/g, "list = [];");
  src = src.replace(/setRows\(DEMO_\w+_LIST\)/g, "setRows([])");
  src = src.replace(/setSummary\(DEMO_\w+_SUMMARY\)/g, "setSummary(EMPTY_INCOMING_SUMMARY)");
  // fix setSummary per file - generic
  src = src.replace(/setSummary\(EMPTY_INCOMING_SUMMARY\)/g, (m, offset, str) => {
    if (rel.includes("InProcess")) return "setSummary(EMPTY_PROCESS_SUMMARY)";
    if (rel.includes("FinalQC")) return "setSummary(EMPTY_FINAL_SUMMARY)";
    if (rel.includes("BatchQuality")) return "setSummary(EMPTY_BATCH_SUMMARY)";
    if (rel.includes("Defect")) return "setSummary(EMPTY_REJECTION_SUMMARY)";
    return m;
  });

  src = src.replace(/addToast\(\s*["']Showing sample[^"']*["']\s*,\s*["']warning["']\s*\)\s*;?/g, "");
  src = src.replace(/hub\.kpi_trends \|\| EMPTY_QUALITY_HUB\.kpi_trends/g, "hub.kpi_trends || {}");

  if (src !== orig) writeIfChanged(fp, src);
}

// QualityInspection + ComplianceLogs
const qi = path.join(srcRoot, "pages/quality/QualityInspection.jsx");
if (fs.existsSync(qi)) {
  let s = fs.readFileSync(qi, "utf8");
  s = s.replace(/import \{ DEMO_INCOMING_LIST \}[^\n]+\n/, "");
  s = s.replace(/\s*fallbackData=\{DEMO_INCOMING_LIST\}/, "");
  writeIfChanged(qi, s);
}

const cl = path.join(srcRoot, "pages/quality/ComplianceLogs.jsx");
if (fs.existsSync(cl)) {
  let s = fs.readFileSync(cl, "utf8");
  s = s.replace(/const DEMO_COMPLIANCE_LOGS = \[[\s\S]*?\];\s*\n/, "");
  s = s.replace(/\s*fallbackData=\{DEMO_COMPLIANCE_LOGS\}/, "");
  writeIfChanged(cl, s);
}

// --- HR pages ---
const hrPages = walk(path.join(srcRoot, "pages/hr"));
for (const fp of hrPages) {
  let src = fs.readFileSync(fp, "utf8");
  const orig = src;
  src = src.replace(/DEMO_\w+_DASHBOARD/g, (m) => {
    const map = {
      DEMO_HR_HUB: "EMPTY_HR_HUB",
      DEMO_ATTENDANCE_DASHBOARD: "EMPTY_ATTENDANCE_DASHBOARD",
      DEMO_LEAVE_DASHBOARD: "EMPTY_LEAVE_DASHBOARD",
      DEMO_PAYROLL_DASHBOARD: "EMPTY_PAYROLL_DASHBOARD",
      DEMO_PERFORMANCE_DASHBOARD: "EMPTY_PERFORMANCE_DASHBOARD",
      DEMO_RECRUITMENT_DASHBOARD: "EMPTY_RECRUITMENT_DASHBOARD",
      DEMO_TRAINING_DASHBOARD: "EMPTY_TRAINING_DASHBOARD",
    };
    return map[m] || m;
  });
  src = src.replace(/DEMO_HR_HUB/g, "EMPTY_HR_HUB");
  src = src.replace(/DEMO_PAY_SUMMARY/g, "EMPTY_PAY_SUMMARY");
  src = src.replace(/addToast\(\s*["']Showing sample[^"']*["']\s*,\s*["']warning["']\s*\)\s*;?/g, "");
  if (src !== orig) writeIfChanged(fp, src);
}

// --- ResourcePage: remove fallback usage on error ---
const rp = path.join(srcRoot, "components/common/ResourcePage.jsx");
if (fs.existsSync(rp)) {
  let s = fs.readFileSync(rp, "utf8");
  const orig = s;
  s = s.replace(
    /} else if \(fallbackRef\.current\?\.length > 0\) \{\s*setRows\(fallbackRef\.current\);\s*\} else \{/,
    "} else {"
  );
  s = s.replace(
    /catch[^}]*fallbackRef\.current[^}]*setRows\(fallbackRef\.current\)[^}]*\}/s,
    (m) => m.replace(/if \(fallbackRef\.current\?\.length > 0\) \{\s*setRows\(fallbackRef\.current\);\s*\} else \{\s*setRows\(\[\]\);\s*\}/, "setRows([]);")
  );
  if (s !== orig) writeIfChanged(rp, s);
}

// --- alertUtils ---
const au = path.join(srcRoot, "utils/alertUtils.js");
if (fs.existsSync(au)) {
  let s = fs.readFileSync(au, "utf8");
  s = s.replace(/export const DEMO_ALERTS = \[[\s\S]*?\];\s*\n/, "export const DEMO_ALERTS = [];\n\n");
  writeIfChanged(au, s);
}

// --- Landing demo copy ---
const landing = path.join(srcRoot, "pages/Landing.jsx");
if (fs.existsSync(landing)) {
  let s = fs.readFileSync(landing, "utf8");
  s = s.replace(/Demo access with sample data/gi, "Secure tenant access");
  writeIfChanged(landing, s);
}

console.log("Inventory/quality/HR page pass done.");
