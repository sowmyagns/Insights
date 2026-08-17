import api from "./axiosConfig";

function unwrap(res) {
  const body = res?.data;
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return { ...res, data: body.data, message: body.message };
  }
  return res;
}

export async function fetchNotifications(page = 1, pageSize = 20) {
  try {
    return unwrap(
      await api.get("/api/notifications", { params: { page, page_size: pageSize } })
    );
  } catch (error) {
    console.error("[notificationService.fetchNotifications] Error fetching notifications:", error.message, { page, pageSize });
    throw error;
  }
}

export async function fetchUnreadCount() {
  try {
    return unwrap(await api.get("/api/notifications/unread-count"));
  } catch (error) {
    console.error("[notificationService.fetchUnreadCount] Error fetching unread count:", error.message);
    throw error;
  }
}

export async function markNotificationRead(notificationId) {
  try {
    return unwrap(await api.put(`/api/notifications/${notificationId}/read`));
  } catch (error) {
    console.error("[notificationService.markNotificationRead] Error marking notification as read:", error.message, { notificationId });
    throw error;
  }
}

export async function markAllNotificationsRead() {
  try {
    return unwrap(await api.put("/api/notifications/read-all"));
  } catch (error) {
    console.error("[notificationService.markAllNotificationsRead] Error marking all notifications as read:", error.message);
    throw error;
  }
}

export async function deleteNotification(notificationId) {
  try {
    return unwrap(await api.delete(`/api/notifications/${notificationId}`));
  } catch (error) {
    console.error("[notificationService.deleteNotification] Error deleting notification:", error.message, { notificationId });
    throw error;
  }
}

export async function clearAllNotifications() {
  try {
    return unwrap(await api.delete("/api/notifications/clear"));
  } catch (error) {
    console.error("[notificationService.clearAllNotifications] Error clearing notifications:", error.message);
    throw error;
  }
}

export async function createNotification(payload) {
  try {
    return unwrap(await api.post("/api/notifications", payload));
  } catch (error) {
    console.error("[notificationService.createNotification] Error creating notification:", error.message, { payload });
    throw error;
  }
}
