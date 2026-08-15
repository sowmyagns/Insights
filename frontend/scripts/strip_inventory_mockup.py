"""Remove MOCKUP demo data from inventory pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src" / "pages" / "inventory"

FILES = [
    "RawMaterials.jsx",
    "FinishedGoods.jsx",
    "Warehouses.jsx",
    "StockLedger.jsx",
    "StockTransfer.jsx",
    "StockAdjustment.jsx",
    "InventoryDashboard.jsx",
]

ZERO_SUMMARY = """const EMPTY_SUMMARY = {
  total_items: 0,
  stock_value: 0,
  low_stock: 0,
  out_of_stock: 0,
  total_quantity: 0,
};"""

for name in FILES:
    path = ROOT / name
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    orig = src

    # Remove MOCKUP constant blocks
    src = re.sub(
        r"/\*\*[^*]*(?:mockup|preview|Preview)[^*]*\*/\s*\nconst MOCKUP[\w]*\s*=\s*(?:\[[\s\S]*?\]|{[\s\S]*?});?\s*\n",
        "",
        src,
    )
    src = re.sub(r"\nconst MOCKUP[\w]*\s*=\s*\[[\s\S]*?\];\s*\n", "\n", src)
    src = re.sub(r"\nconst MOCKUP[\w]*\s*=\s*\{[\s\S]*?\};\s*\n", "\n", src)
    src = re.sub(r"\nconst MOCKUP\s*=\s*\{[\s\S]*?\};\s*\n", "\n", src)

    if "EMPTY_SUMMARY" not in src and "MOCKUP_SUMMARY" in orig:
        src = src.replace(
            "import { notifyManufacturingSpine",
            f"{ZERO_SUMMARY}\n\nimport {{ notifyManufacturingSpine",
            1,
        ) if "notifyManufacturingSpine" in src else ZERO_SUMMARY + "\n\n" + src

    src = src.replace("return MOCKUP_ROWS.map((r) => ({ ...r, live: false }));", "return [];")
    src = src.replace("return MOCKUP_ENTRIES.map((e) => ({ ...e, live: false }));", "return [];")
    src = src.replace("return MOCKUP_TRANSFERS;", "return [];")
    src = src.replace("return MOCKUP_ADJUSTMENTS;", "return [];")
    src = src.replace("return MOCKUP_WAREHOUSES;", "return [];")
    src = src.replace("if (!hasLiveData) return MOCKUP_SUMMARY;", "if (!hasLiveData) return EMPTY_SUMMARY;")
    src = src.replace("if (!hasLiveData) return MOCKUP_KPIS;", """if (!hasLiveData) return {
      total_warehouses: 0, total_capacity: 0, utilization_pct: 0, active_bins: 0,
    };""")

    # Simplify rows useMemo - remove hasLiveData mock branch
    src = re.sub(
        r"const hasLiveData = \w+\.length > 0;\s*\n\s*const rows = useMemo\(\(\) => \{\s*if \(hasLiveData\) \{\s*return (\w+)\.map\(",
        r"const rows = useMemo(() => {\n    return \1.map(",
        src,
    )
    src = re.sub(
        r"\}\);\s*\}\s*return \[\];\s*\}, \[hasLiveData, \w+\]\);",
        r"});\n  }, [\1]);",
        src,
        count=1,
    )

    # kpis - remove hasLiveData guard at start
    src = src.replace("if (!hasLiveData) return EMPTY_SUMMARY;", "")
    src = src.replace("}, [hasLiveData, rows, summary]);", "}, [rows, summary]);")
    src = src.replace("}, [hasLiveData, filtered]);", "}, [filtered]);")
    src = src.replace("}, [hasLiveData, summary, filtered]);", "}, [summary, filtered]);")

    # InventoryDashboard displayData
    src = re.sub(
        r"return \{\s*\.\.\.MOCKUP,[\s\S]*?lowStockItems: \[\],?\s*\};",
        """return {
      total_items: liveStockValue.total_items || 0,
      stock_value: liveStockValue.value || 0,
      movements: [],
      lowStockItems: [],
      kpis: liveStatus,
    };""",
        src,
    )

    if src != orig:
        path.write_text(src, encoding="utf-8")
        print("updated:", name)
