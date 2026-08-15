"""One-off: unwrap nested Outer Corrugated Box / duplicate product labels."""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "smrt.db"


def peel_outer_box_layers(s: str) -> str:
    """Reduce 'Outer Corrugated Box (Outer Corrugated Box (FG))' → 'Outer Corrugated Box (FG)'."""
    prefix = "outer corrugated box ("
    t = s.strip()
    layers = 0
    lower = t.lower()
    while lower.startswith(prefix) and t.endswith(")"):
        t = t[len("Outer Corrugated Box (") : -1].strip()
        layers += 1
        lower = t.lower()
    if layers == 0:
        return s.strip()
    # If we peeled into another Outer Corrugated Box (...), peel those cores too
    while lower.startswith(prefix) and t.endswith(")"):
        t = t[len("Outer Corrugated Box (") : -1].strip()
        lower = t.lower()
    return f"Outer Corrugated Box ({t})"


def fg_core_from_box(s: str) -> str:
    t = peel_outer_box_layers(s)
    m = re.match(r"^Outer Corrugated Box\s+\((.+)\)\s*$", t, flags=re.I)
    return m.group(1).strip() if m else t


def clean(name: str) -> str:
    s = re.sub(r"\s+", " ", (name or "").strip())
    for label in ("Raw Polymer / Resin", "Preform / Sub-component"):
        m = re.match(rf"^({re.escape(label)})\s+\((.+)\)\s*$", s, flags=re.I)
        if m:
            return f"{m.group(1)} ({fg_core_from_box(m.group(2))})"
    if s.lower().startswith("outer corrugated box ("):
        return peel_outer_box_layers(s)
    while True:
        prev = s
        m = re.match(r"^(.+?)\s+\(\1(?:\s*\((.+)\))?\)\s*$", s, flags=re.I)
        if m:
            s = f"{m.group(1)} ({m.group(2)})" if m.group(2) else m.group(1)
        if s == prev:
            break
    return s


def main() -> None:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    updated = 0
    # Materialize first — updating while iterating the SELECT cursor skips rows in SQLite.
    rows = list(cur.execute("SELECT id, name FROM products"))
    for pid, name in rows:
        new = clean(name)
        if new != name:
            print(f"{pid}: {name!r} -> {new!r}")
            cur.execute("UPDATE products SET name = ? WHERE id = ?", (new, pid))
            updated += 1
    conn.commit()
    print("updated", updated)
    print("sample packaging:")
    for row in cur.execute(
        "SELECT id, sku, name FROM products WHERE name LIKE '%Outer%' OR sku LIKE 'PKG-%' LIMIT 25"
    ):
        print(row)
    conn.close()


if __name__ == "__main__":
    main()
