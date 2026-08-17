import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Eye,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
  Video,
} from "lucide-react";

export default function MeetingRowActionsMenu({
  rowId,
  isOpen,
  onOpen,
  onClose,
  onView,
  onEdit,
  onDelete,
  onOpenCalendar,
  onJoinMeeting,
  onSyncGoogle,
  hasCalendarLink = false,
  hasMeetLink = false,
  googleConnected = false,
}) {
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuWidth = 188;

  const items = [
    { key: "view", label: "View", icon: Eye, onClick: onView },
    { key: "edit", label: "Edit", icon: Pencil, onClick: onEdit },
    googleConnected && onSyncGoogle
      ? { key: "sync", label: hasCalendarLink ? "Update in Google Calendar" : "Sync to Google Calendar", icon: RefreshCw, onClick: onSyncGoogle }
      : null,
    hasCalendarLink && onOpenCalendar
      ? { key: "calendar", label: "Open Calendar", icon: Calendar, onClick: onOpenCalendar }
      : null,
    hasMeetLink && onJoinMeeting
      ? { key: "join", label: "Join Meeting", icon: Video, onClick: onJoinMeeting }
      : null,
    { key: "delete", label: "Delete", icon: Trash2, onClick: onDelete, danger: true },
  ].filter(Boolean);

  const toggleMenu = (event) => {
    event.stopPropagation();
    if (isOpen) {
      onClose();
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const itemHeight = 36;
      const menuHeight = items.length * itemHeight + 8;
      let top = rect.bottom + 4;
      let left = Math.max(8, rect.right - menuWidth);
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - 4);
      }
      if (left + menuWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - menuWidth - 8);
      }
      setMenuPos({ top, left });
    }
    onOpen(rowId);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleMenu}
        className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
        aria-label="More actions"
        title="More"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {isOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[9998] cursor-default bg-transparent"
                aria-label="Close menu"
                onClick={onClose}
              />
              <div
                className="fixed z-[9999] min-w-[11rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
                style={{ top: menuPos.top, left: menuPos.left, width: menuWidth }}
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        item.onClick?.();
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-muted)] ${
                        item.danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {item.label}
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
