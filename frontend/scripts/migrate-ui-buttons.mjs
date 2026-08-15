/**
 * Codemod: replace raw ui-btn-* class usage with <Button variant="…">.
 * Run: node scripts/migrate-ui-buttons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

const VARIANT_MAP = {
  "ui-btn-primary": "primary",
  "ui-btn-secondary": "secondary",
  "ui-btn-success": "success",
  "ui-btn-warning": "warning",
  "ui-btn-cta": "warning",
  "ui-btn-danger": "danger",
  "ui-btn-ghost": "ghost",
  "ui-btn-hr": "primary",
  "ui-btn-outline": "outline",
};

const SKIP = new Set([
  path.join(SRC, "components", "common", "Button.jsx"),
  path.join(SRC, "components", "common", "ActionButton.jsx"),
  path.join(SRC, "components", "common", "Button.test.jsx"),
  path.join(SRC, "components", "common", "ActionButton.test.jsx"),
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "__pycache__") continue;
      walk(p, out);
    } else if (/\.(jsx|tsx|js)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function relImport(fromFile) {
  const fromDir = path.dirname(fromFile);
  const target = path.join(SRC, "components", "common", "Button.jsx");
  let rel = path.relative(fromDir, target).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.jsx$/, "");
}

function ensureImport(code, fromFile) {
  if (/from\s+["'][^"']*components\/common\/Button["']/.test(code)) return code;
  if (/from\s+["'][^"']*\/Button["']/.test(code) && /import\s+Button\b/.test(code)) return code;
  const imp = `import Button from "${relImport(fromFile)}";\n`;
  // After last import
  const importBlock = [...code.matchAll(/^import[\s\S]*?;\s*$/gm)];
  if (importBlock.length) {
    const last = importBlock[importBlock.length - 1];
    const idx = last.index + last[0].length;
    return code.slice(0, idx) + "\n" + imp + code.slice(idx);
  }
  return imp + code;
}

function transformFile(filePath) {
  if (SKIP.has(filePath)) return false;
  let code = fs.readFileSync(filePath, "utf8");
  if (!/ui-btn-(primary|secondary|success|warning|cta|danger|ghost|hr|outline)/.test(code)) {
    return false;
  }

  let changed = false;
  const variantAlt = Object.keys(VARIANT_MAP).join("|");

  // <button … className="ui-btn-primary …" …>
  // Also Link with ui-btn classes
  const tagRe = new RegExp(
    `<(button|Link|a)(\\s[^>]*?)className=["'\`]([^"'\`]*\\b(?:${variantAlt})\\b[^"'\`]*)["'\`]([^>]*)>`,
    "g",
  );

  code = code.replace(tagRe, (full, tag, before, className, after) => {
    let variant = null;
    let restClasses = className
      .split(/\s+/)
      .filter((c) => {
        if (VARIANT_MAP[c]) {
          variant = VARIANT_MAP[c];
          return false;
        }
        // Drop bare ui-btn if present (Button adds it)
        if (c === "ui-btn") return false;
        return Boolean(c);
      })
      .join(" ");

    if (!variant) return full;

    // Extract type= from before/after for buttons
    const attrs = `${before} ${after}`;
    let typeAttr = "";
    const typeMatch = attrs.match(/\stype=["']([^"']+)["']/);
    if (tag === "button" && typeMatch) typeAttr = ` type="${typeMatch[1]}"`;

    // Remove type from remaining attrs to avoid duplicate when we rebuild — keep other attrs
    let other = `${before}${after}`
      .replace(/\stype=["'][^"']+["']/, "")
      .replace(/\s+/g, " ")
      .trim();

    // to= for Link
    let toProp = "";
    if (tag === "Link") {
      const toM = other.match(/\sto=\{?["']([^"'}]+)["']\}?/) || other.match(/\sto=\{([^}]+)\}/);
      // keep as-is in other
    }

    const classProp = restClasses ? ` className="${restClasses}"` : "";
    changed = true;

    if (tag === "Link") {
      // Keep Link attrs (to, …), use Button with to via remaining
      // Convert: <Button variant="x" to=…>
      // Prefer leaving `to` on Button — strip Link-only noise
      return `<Button variant="${variant}"${classProp} ${other}>`.replace(/\s+/g, " ").replace(" >", ">");
    }
    if (tag === "a") {
      return `<Button variant="${variant}" as="a"${classProp} ${other}>`.replace(/\s+/g, " ").replace(" >", ">");
    }
    return `<Button variant="${variant}"${typeAttr || ' type="button"'} ${other}${classProp}>`
      .replace(/\s+/g, " ")
      .replace(" >", ">");
  });

  // Closing tags: </button> that we converted are hard — leave as-is if still button.
  // For Link→Button, change </Link> only when we converted — too risky globally.
  // Instead replace adjacent patterns for common self-contained buttons.

  // Simpler second pass: className={"ui-btn-primary"} etc on button
  const clsExprRe = new RegExp(
    `<(button)(\\s[^>]*?)className=\\{["'\`](${variantAlt})["'\`]\\}([^>]*)>`,
    "g",
  );
  code = code.replace(clsExprRe, (full, tag, before, cls, after) => {
    const variant = VARIANT_MAP[cls];
    if (!variant) return full;
    changed = true;
    const attrs = `${before}${after}`.replace(/\s+/g, " ").trim();
    const hasType = /\stype=/.test(attrs);
    return `<Button variant="${variant}"${hasType ? "" : ' type="button"'} ${attrs}>`.replace(/\s+/g, " ").replace(" >", ">");
  });

  // ui-btn-hr → treat as primary alias in remaining class strings on Button already handled

  if (!changed) return false;

  // Close tags: replace </button> only is wrong. Leave closing tags —
  // React accepts <Button>...</button> NO it doesn't!
  // Must fix closing tags. Strategy: only transform when open+close are close.

  // Re-read: if we changed opening tags to Button, replace matching closes is fragile.
  // Better approach: transform full element with balanced tags for simple cases.

  code = ensureImport(code, filePath);

  // Fix obvious </button> after Button open on same short blocks — replace ALL </button> that follow Button? Too dangerous.

  // Fix: for each <Button ...> ... </button> or </Link> within reasonable distance
  code = code.replace(/<Button\b([^>]*)>([\s\S]*?)<\/(button|Link|a)>/g, (m, attrs, inner, close) => {
    return `<Button${attrs}>${inner}</Button>`;
  });

  fs.writeFileSync(filePath, code, "utf8");
  return true;
}

const files = walk(SRC);
let n = 0;
for (const f of files) {
  try {
    if (transformFile(f)) {
      n += 1;
      console.log("migrated", path.relative(SRC, f));
    }
  } catch (e) {
    console.error("fail", f, e.message);
  }
}
console.log(`Done. Migrated ${n} files.`);
