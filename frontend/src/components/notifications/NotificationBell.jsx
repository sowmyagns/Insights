import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";

import { useToast } from "../../context/ToastContext";
import useNotifications from "../../hooks/useNotifications";
import NotificationBadge from "./NotificationBadge";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  const {
    count,
    notifications,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleOpen = async (notification) => {
    const isRead = notification.is_read ?? notification.read;
    if (!isRead) {
      await markRead(notification.id);
    }
    setOpen(false);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleMarkRead = async (notification) => {
    await markRead(notification.id);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      addToast("All notifications marked as read");
    } catch {
      addToast("Failed to mark notifications as read", "error");
    }
  };

  const handleDelete = async (notification) => {
    try {
      await deleteNotification(notification.id);
      addToast("Notification deleted");
    } catch {
      addToast("Failed to delete notification", "error");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      addToast("All notifications have been cleared successfully.");
    } catch {
      addToast("Failed to clear notifications", "error");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        title={t("common.notifications")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        <NotificationBadge count={count} />
      </button>

      <NotificationDropdown
        open={open}
        notifications={notifications}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        onOpen={handleOpen}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
