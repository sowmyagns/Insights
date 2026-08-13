/** Extended product master fields — merged with API catalog rows in the UI. */

export const PRODUCT_CATEGORIES = [
  "Raw Material",
  "Work in Progress (WIP)",
  "Finished Goods",
  "Consumables",
  "Spare Parts",
];

export const PRODUCT_TYPES = ["Raw Material", "Semi-Finished", "Finished Goods", "Service"];

export const PRODUCT_STATUSES = ["active", "inactive"];

export const WAREHOUSES = ["Main Store", "Production Store", "Finished Goods (FG) Store", "Quality Control (QC) Store"];

export const BRANDS = ["Tata Steel", "Bosch", "Siemens", "Local", "Generic"];

export const PRODUCT_UNITS = [
  "PCS",
  "NOS",
  "KGS",
  "GMS",
  "MTR",
  "SQMTR",
  "LTR",
  "BOX",
  "PACK",
  "SET",
  "TON",
  "CBM",
  "FT",
  "SQFT",
  "INCH",
  "MM",
  "CM",
  "PAIR",
  "ROLL",
  "BAG",
  "CAN",
  "DRUM",
  "PKT",
  "BUNDLE",
  "COIL",
  "SHEET",
  "KG",
  "ML",
];

export const DEMO_PRODUCTS = [];


export function guessCategory(sku = "", name = "") {
  const s = `${sku} ${name}`.toLowerCase();
  if (s.includes("part") || s.includes("stl") || s.includes("raw")) return "Raw Material";
  if (s.includes("widget") || s.includes("motor") || s.includes("valve")) return "Finished Goods";
  if (s.includes("lub") || s.includes("oil")) return "Consumables";
  return "Finished Goods";
}

export function enrichApiProduct(apiRow) {
  let category = apiRow.category;
  if (!category || category === "Finished Goods" || category === "No Category") {
    const descMatch = apiRow.description?.match(/Category:\s*([^|]+)/i);
    if (descMatch && descMatch[1]?.trim()) {
      category = descMatch[1].trim();
    }
  }
  if (!category || category === "No Category") {
    category = "Finished Goods";
  }
  if (category === "Work in Progress (WIP)" || category === "Work In Progress") {
    category = "WIP";
  }
  const stock = apiRow.current_stock != null ? Number(apiRow.current_stock) : 0;
  const minStock = apiRow.min_stock != null ? Number(apiRow.min_stock) : 0;
  const maxStock = apiRow.max_stock != null ? Number(apiRow.max_stock) : 0;
  const unit = apiRow.unit || apiRow.unit_of_measure || apiRow.uom || "Pcs";

  // price_per_unit comes from unit_cost in backend
  const pricePerUnit = apiRow.price_per_unit != null
    ? Number(apiRow.price_per_unit)
    : apiRow.unit_cost != null
    ? Number(apiRow.unit_cost)
    : 0;

  // quantity comes from current_stock in backend
  const quantity = apiRow.quantity != null
    ? Number(apiRow.quantity)
    : stock;

  // total_cost = quantity * price_per_unit
  const totalCost = apiRow.total_cost != null
    ? Number(apiRow.total_cost)
    : apiRow.unit_price != null
    ? Number(apiRow.unit_price)
    : quantity * pricePerUnit;

  return {
    id: apiRow.id,
    product_code: apiRow.product_code || (apiRow.id ? `PRD${String(apiRow.id).padStart(3, "0")}` : "—"),
    name: apiRow.name || "—",
    category,
    product_type: apiRow.product_type || (category === "Raw Material" ? "Raw Material" : "Finished Goods"),
    sku: apiRow.sku || "—",
    barcode: apiRow.barcode || "—",
    brand: apiRow.brand || "—",
    unit,
    hsn_code: apiRow.hsn_code || "—",
    gst_percent: apiRow.gst_percent ?? 0,
    quantity,
    price_per_unit: pricePerUnit,
    purchase_price: pricePerUnit,
    selling_price: totalCost,
    total_cost: totalCost,
    min_stock: minStock,
    max_stock: maxStock,
    current_stock: stock,
    warehouse: apiRow.warehouse || "—",
    description: apiRow.description || "",
    status: apiRow.status || "active",
    bom: apiRow.bom || "—",
    production_time: apiRow.production_time || "—",
    machine_required: apiRow.machine_required || "—",
    quality_standard: apiRow.quality_standard || "—",
    batch_tracking: Boolean(apiRow.batch_tracking),
    serial_number: Boolean(apiRow.serial_number),
    expiry_date: apiRow.expiry_date || null,
    units_sold: apiRow.units_sold ?? 0,
    stock_value: stock * pricePerUnit,
    created_at: apiRow.created_at || new Date().toISOString().slice(0, 10),
  };
}



export function computeSummary(products) {
  const categories = new Set(products.map((p) => p.category));
  return {
    total: products.length,
    active: products.filter((p) => p.status === "active").length,
    inactive: products.filter((p) => p.status === "inactive").length,
    lowStock: products.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock).length,
    outOfStock: products.filter((p) => p.current_stock === 0).length,
    categories: categories.size,
  };
}

export function computeQuickStats(products) {
  if (!products.length) {
    return {
      mostSold: "—",
      highestStock: "—",
      lowestStock: "—",
      recentlyAdded: "—",
      pendingApproval: 0,
    };
  }
  const mostSold = [...products].sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0))[0];
  const highest = [...products].sort((a, b) => b.current_stock - a.current_stock)[0];
  const lowest = [...products].filter((p) => p.current_stock > 0).sort((a, b) => a.current_stock - b.current_stock)[0];
  const recent = [...products].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
  return {
    mostSold: mostSold?.name || "—",
    highestStock: highest ? `${highest.name} (${highest.current_stock})` : "—",
    lowestStock: lowest ? `${lowest.name} (${lowest.current_stock})` : "—",
    recentlyAdded: recent?.name || "—",
    pendingApproval: products.filter((p) => p.status === "inactive").length,
  };
}

export const categoryChartData = [
  { name: "Raw Material", value: 35, color: "#3B82F6" },
  { name: "Finished Goods", value: 28, color: "#22C55E" },
  { name: "Work in Progress (WIP)", value: 12, color: "#F97316" },
  { name: "Consumables", value: 15, color: "#A855F7" },
  { name: "Spare Parts", value: 10, color: "#64748B" },
];
export const IMPORT_TEMPLATE_HEADERS = [
  "product_code",
  "name",
  "category",
  "sku",
  "unit",
  "purchase_price",
  "selling_price",
  "min_stock",
  "max_stock",
  "warehouse",
  "status",
];
