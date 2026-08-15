#!/usr/bin/env python3
"""Safely migrate simple ui-btn-* class usages to <Button variant="…">."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src"
SKIP = {
    ROOT / "components/common/Button.jsx",
    ROOT / "components/common/ActionButton.jsx",
    ROOT / "components/common/Button.test.jsx",
    ROOT / "components/common/ActionButton.test.jsx",
}

VARIANT = {
    "ui-btn-primary": "primary",
    "ui-btn-secondary": "secondary",
    "ui-btn-success": "success",
    "ui-btn-warning": "warning",
    "ui-btn-cta": "warning",
    "ui-btn-danger": "danger",
    "ui-btn-ghost": "ghost",
    "ui-btn-hr": "primary",
    "ui-btn-outline": "outline",
}
VARIANT_RE = "|".join(map(re.escape, VARIANT))


def rel_import(file: Path) -> str:
    target = ROOT / "components/common/Button.jsx"
    rel = Path(file).parent.relative_to(ROOT)
    # count depth
    depth = len(rel.parts)
    prefix = "../" * depth if depth else "./"
    # from file under src/…
    from_dir = file.parent
    try:
        r = Path(os_path_rel(from_dir, target.parent))
    except Exception:
        r = Path("../" * depth + "components/common")
    s = str(Path(os_path_rel(from_dir, target)).with_suffix("")).replace("\\", "/")
    if not s.startswith("."):
        s = "./" + s
    return s


def os_path_rel(a: Path, b: Path) -> str:
    return str(Path(b).resolve().relative_to(Path(a).resolve()) if False else __import__("os").path.relpath(b, a))


def ensure_import(code: str, file: Path) -> str:
    if re.search(r'import\s+Button\b.*from\s+[\'"][^\'"]*Button[\'"]', code):
        return code
    if re.search(r'from\s+[\'"][^\'"]*common/Button[\'"]', code):
        return code
    imp = f'import Button from "{rel_import(file)}";\n'
    matches = list(re.finditer(r'^import .+?;\s*\n', code, re.M))
    if matches:
        last = matches[-1]
        return code[: last.end()] + imp + code[last.end() :]
    return imp + code


def extract_variant(class_str: str) -> tuple[str | None, str]:
    parts = class_str.split()
    variant = None
    rest = []
    for p in parts:
        if p in VARIANT:
            variant = VARIANT[p]
        elif p == "ui-btn":
            continue
        else:
            rest.append(p)
    return variant, " ".join(rest)


def transform(code: str) -> tuple[str, int]:
    count = 0

    # Pattern: <button ... className="...ui-btn-X..." ...>  (single-line open tag)
    def repl_button(m: re.Match) -> str:
        nonlocal count
        before, cls, after = m.group(1), m.group(2), m.group(3)
        variant, rest = extract_variant(cls)
        if not variant:
            return m.group(0)
        attrs = f"{before} {after}"
        # drop className already consumed
        type_m = re.search(r'\stype=(["\'])(.*?)\1', attrs)
        type_attr = f' type="{type_m.group(2)}"' if type_m else ' type="button"'
        attrs = re.sub(r'\stype=(["\']).*?\1', "", attrs)
        attrs = attrs.strip()
        class_prop = f' className="{rest}"' if rest else ""
        count += 1
        return f'<Button variant="{variant}"{type_attr} {attrs}{class_prop}>'.replace("  ", " ")

    code2 = re.sub(
        rf'<button(\s[^>]*?)className=["\']([^"\']*\b(?:{VARIANT_RE})\b[^"\']*)["\']([^>]*)>',
        repl_button,
        code,
    )

    # <Link ... className="ui-btn-X" ...>
    def repl_link(m: re.Match) -> str:
        nonlocal count
        before, cls, after = m.group(1), m.group(2), m.group(3)
        variant, rest = extract_variant(cls)
        if not variant:
            return m.group(0)
        attrs = f"{before} {after}".strip()
        class_prop = f' className="{rest}"' if rest else ""
        count += 1
        return f'<Button variant="{variant}" {attrs}{class_prop}>'.replace("  ", " ")

    code3 = re.sub(
        rf'<Link(\s[^>]*?)className=["\']([^"\']*\b(?:{VARIANT_RE})\b[^"\']*)["\']([^>]*)>',
        repl_link,
        code2,
    )

    if count == 0:
        return code, 0

    # Fix closing tags for migrated opens: </button> / </Link> after <Button — heuristics
    # Replace pairs in a loop for short spans
    def fix_closes(src: str) -> str:
        out = []
        i = 0
        while i < len(src):
            m = re.search(r"<Button\b", src[i:])
            if not m:
                out.append(src[i:])
                break
            start = i + m.start()
            out.append(src[i:start])
            # find end of open tag
            gt = src.find(">", start)
            if gt < 0:
                out.append(src[start:])
                break
            if src[gt - 1] == "/":
                out.append(src[start : gt + 1])
                i = gt + 1
                continue
            # find matching close within 800 chars
            window = src[gt + 1 : gt + 1 + 800]
            cm = re.search(r"</(button|Link)>", window)
            if cm:
                inner = window[: cm.start()]
                # only if no nested Button
                if "<Button" not in inner and "<button" not in inner.lower():
                    out.append(src[start : gt + 1])
                    out.append(inner)
                    out.append("</Button>")
                    i = gt + 1 + cm.end()
                    continue
            out.append(src[start : gt + 1])
            i = gt + 1
        return "".join(out)

    return fix_closes(code3), count


def main() -> None:
    total_files = 0
    total_hits = 0
    for path in sorted(ROOT.rglob("*.jsx")):
        if path in SKIP:
            continue
        text = path.read_text(encoding="utf-8")
        if not re.search(VARIANT_RE, text):
            continue
        new, n = transform(text)
        if n == 0:
            continue
        new = ensure_import(new, path)
        # Drop unused Link import if no <Link left
        if "<Link" not in new and re.search(r'import\s*\{[^}]*\bLink\b[^}]*\}\s*from\s*[\'"]react-router-dom[\'"]', new):
            def strip_link(m):
                inner = m.group(1)
                parts = [p.strip() for p in inner.split(",") if p.strip() and p.strip() != "Link"]
                if not parts:
                    return ""
                return f"import {{ {', '.join(parts)} }} from \"react-router-dom\";\n"

            new = re.sub(
                r'import\s*\{([^}]*)\}\s*from\s*[\'"]react-router-dom[\'"];\s*\n',
                strip_link,
                new,
            )
        path.write_text(new, encoding="utf-8")
        total_files += 1
        total_hits += n
        print(f"{path.relative_to(ROOT)}: {n}")
    print(f"Migrated {total_hits} buttons in {total_files} files")


if __name__ == "__main__":
    main()
