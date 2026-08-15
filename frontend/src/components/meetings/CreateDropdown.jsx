import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

const MENU_ITEMS = [
  { id: "event", label: "Event" },
  { id: "task", label: "Task" },
  { id: "appointment", label: "Appointment schedule" },
];

export default function CreateDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handlePick = (id) => {
    setOpen(false);
    onSelect?.(id);
  };

  return (
    <div className="meetings-cal__create-wrap" ref={wrapRef}>
      <button
        type="button"
        className="meetings-cal__create"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="meetings-cal__create-plus" strokeWidth={2.25} aria-hidden />
        <span className="meetings-cal__create-label">Create</span>
        <ChevronDown className={`meetings-cal__create-chevron ${open ? "is-open" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="meetings-cal__create-menu" role="menu">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="meetings-cal__create-menu-item"
              onClick={() => handlePick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
