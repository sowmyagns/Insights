import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { AuthContext } from "../../context/AuthContext.jsx";

const MENU_WIDTH = 176;
const ITEM_HEIGHT = 36;

export default function RowActionMenu({ rowId, openMenu, setOpenMenu, items = [] }) {
  const auth = useContext(AuthContext);
  const role = (auth?.user?.role ?? auth?.user?.role_name ?? "").toLowerCase();
  const isOperator = role === "operator";

  if (isOperator) return null;

  const [localOpen, setLocalOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const isControlled = openMenu !== undefined && setOpenMenu !== undefined;
  const isOpen = isControlled ? openMenu === rowId : localOpen;

  const setIsOpen = (val) => {
    if (isControlled) {
      setOpenMenu(val ? rowId : null);
    } else {
      setLocalOpen(val);
    }
  };

  const visibleItems = (items || []).filter(Boolean);
  if (visibleItems.length === 0) return null;

  const openMenuAtButton = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const menuHeight = visibleItems.length * ITEM_HEIGHT + 8;
      let top = rect.bottom + 4;
      let left = Math.max(8, rect.right - MENU_WIDTH);
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - 4);
      }
      if (left + MENU_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
      }
      setMenuPos({ top, left });
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const stopRowClick = (event) => {
    event.stopPropagation();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Open actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onMouseDown={stopRowClick}
        onTouchStart={stopRowClick}
        onPointerDown={stopRowClick}
        onClick={(event) => {
          stopRowClick(event);
          if (isOpen) {
            setIsOpen(false);
          } else {
            openMenuAtButton();
          }
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>

      {isOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[120] cursor-default bg-transparent"
                aria-label="Close menu"
                onClick={() => setIsOpen(false)}
              />
              <div
                className="fixed z-[130] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
                style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
                role="menu"
              >
                {visibleItems.map((item, index) => {
                  const label = String(item.label || "");
                  const labelLower = label.toLowerCase();
                  const isDanger =
                    item.danger ||
                    labelLower.includes("delete") ||
                    labelLower.includes("remove") ||
                    labelLower.includes("reject");

                  return (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      role="menuitem"
                      onMouseDown={stopRowClick}
                      onTouchStart={stopRowClick}
                      onPointerDown={stopRowClick}
                      onClick={(event) => {
                        stopRowClick(event);
                        setIsOpen(false);
                        item.onClick?.();
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        isDanger
                          ? "text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                          : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                      }`}
                    >
                      {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
