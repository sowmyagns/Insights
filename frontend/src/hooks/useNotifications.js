import { useCallback, useEffect, useState } from "react";

import {
  clearAllNotifications,
  deleteNotification as deleteNotificationApi,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notificationService";
import useAuth from "./useAuth";
import usePageRefresh from "./usePageRefresh";

const POLL_MS = 30_000;
const PAGE_SIZE = 20;

function applyListData(setNotifications, setCount, setHasMore, setPage, data, append = false) {
  const items = data?.items ?? data?.notifications ?? [];
  setNotifications((prev) => (append ? [...prev, ...items] : items));
  setCount(data?.unread_count ?? data?.count ?? 0);
  setHasMore(Boolean(data?.has_more));
  if (!append) setPage(data?.page ?? 1);
}

export default function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      setNotifications([]);
      setHasMore(false);
      setPage(1);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchNotifications(1, PAGE_SIZE);
      applyListData(setNotifications, setCount, setHasMore, setPage, res.data);
      setError(null);
    } catch (err) {
      setCount(0);
      setNotifications([]);
      setHasMore(false);
      setError(err.response?.data?.message || err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetchUnreadCount();
      setCount(res.data?.unread_count ?? res.data?.count ?? 0);
    } catch {
      // Keep optimistic count on transient failures.
    }
  }, [isAuthenticated]);

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchNotifications(nextPage, PAGE_SIZE);
      applyListData(setNotifications, setCount, setHasMore, setPage, res.data, true);
      setPage(nextPage);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load more notifications");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, isAuthenticated, loadingMore, page]);

  const markRead = useCallback(
    async (notificationId) => {
      if (!isAuthenticated) return;

      let previousNotifications = [];
      let previousCount = 0;

      setNotifications((prev) => {
        previousNotifications = prev;
        const target = prev.find((n) => n.id === notificationId);
        previousCount = count;
        if (!target || (target.is_read ?? target.read)) return prev;
        setCount((c) => Math.max(0, c - 1));
        return prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read: true } : n
        );
      });

      try {
        const res = await markNotificationRead(notificationId);
        applyListData(setNotifications, setCount, setHasMore, setPage, res.data);
      } catch {
        setNotifications(previousNotifications);
        setCount(previousCount);
        await refreshCount();
      }
    },
    [count, isAuthenticated, refreshCount]
  );

  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    const previousNotifications = notifications;
    const previousCount = count;

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read: true }))
    );
    setCount(0);

    try {
      const res = await markAllNotificationsRead();
      applyListData(setNotifications, setCount, setHasMore, setPage, res.data);
    } catch {
      setNotifications(previousNotifications);
      setCount(previousCount);
      await refresh();
    }
  }, [count, isAuthenticated, notifications, refresh]);

  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!isAuthenticated) return;

      const previousNotifications = notifications;
      const previousCount = count;
      const removed = notifications.find((n) => n.id === notificationId);
      const wasUnread = removed && !(removed.is_read ?? removed.read);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) setCount((c) => Math.max(0, c - 1));

      try {
        const res = await deleteNotificationApi(notificationId);
        applyListData(setNotifications, setCount, setHasMore, setPage, res.data);
      } catch {
        setNotifications(previousNotifications);
        setCount(previousCount);
        await refresh();
      }
    },
    [count, isAuthenticated, notifications, refresh]
  );

  const clearAll = useCallback(async () => {
    if (!isAuthenticated) return;

    const previousNotifications = notifications;
    const previousCount = count;

    setNotifications([]);
    setCount(0);
    setHasMore(false);

    try {
      await clearAllNotifications();
    } catch {
      setNotifications(previousNotifications);
      setCount(previousCount);
      await refresh();
      throw new Error("Failed to clear notifications");
    }
  }, [count, isAuthenticated, notifications, refresh]);

  useEffect(() => {
    refresh();
    if (!isAuthenticated) return undefined;
    // Phase 1: poll unread + soft list so bell stays current.
    // Phase 2: swap interval for WebSocket without changing consumers.
    const id = setInterval(() => {
      refreshCount();
      refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, refreshCount, isAuthenticated]);

  usePageRefresh(refreshCount);

  return {
    count,
    notifications,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll,
  };
}
