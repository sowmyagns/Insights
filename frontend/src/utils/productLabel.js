/** Collapse nested auto-BOM product labels for display. */

function peelOuterBoxLayers(name) {
  const prefix = "outer corrugated box (";
  let t = String(name || "").trim();
  let layers = 0;
  while (t.toLowerCase().startsWith(prefix) && t.endsWith(")")) {
    t = t.slice("Outer Corrugated Box (".length, -1).trim();
    layers += 1;
  }
  if (layers === 0) return String(name || "").trim();
  while (t.toLowerCase().startsWith(prefix) && t.endsWith(")")) {
    t = t.slice("Outer Corrugated Box (".length, -1).trim();
  }
  return `Outer Corrugated Box (${t})`;
}

function fgCoreFromBox(name) {
  const peeled = peelOuterBoxLayers(name);
  const m = peeled.match(/^Outer Corrugated Box\s+\((.+)\)\s*$/i);
  return m ? m[1].trim() : peeled;
}

export function cleanProductLabel(name) {
  let s = String(name || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s || s === "—") return "—";

  for (const label of ["Raw Polymer / Resin", "Preform / Sub-component"]) {
    const re = new RegExp(`^(${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s+\\((.+)\\)\\s*$`, "i");
    const m = s.match(re);
    if (m) return `${m[1]} (${fgCoreFromBox(m[2])})`;
  }

  if (s.toLowerCase().startsWith("outer corrugated box (")) {
    return peelOuterBoxLayers(s);
  }

  let prev;
  do {
    prev = s;
    const dup = s.match(/^(.+?)\s+\(\1(?:\s*\((.+)\))?\)\s*$/i);
    if (dup) {
      s = dup[2] ? `${dup[1]} (${dup[2]})` : dup[1];
    }
  } while (s !== prev);

  return s;
}

/** Prefer finished goods in production / work-order product pickers. */
export function isFinishedGoodProduct(product) {
  if (!product) return false;
  const cat = String(product.category || product.product_type || "").toLowerCase();
  if (/raw|packaging|wip|consumable|spare|component/.test(cat)) return false;
  const sku = String(product.sku || "").toUpperCase();
  if (sku.startsWith("RAW-") || sku.startsWith("PKG-")) return false;
  const pname = String(product.name || "").toLowerCase();
  if (
    pname.startsWith("raw polymer") ||
    pname.startsWith("preform /") ||
    pname.startsWith("outer corrugated box") ||
    pname.startsWith("color masterbatch")
  ) {
    return false;
  }
  return true;
}
