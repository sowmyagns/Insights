import api from "./axiosConfig";
import {
  clearAllNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notificationService";

async function withApiErrorHandling(label, operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    console.error(`[alertsApi.${label}] Error performing request:`, error.message, context);
    throw error;
  }
}

export const getAlerts = (params = {}) =>
  withApiErrorHandling(
    "getAlerts",
    () =>
      api.get("/alerts", { params: { ...params } }).then((res) => {
        // Normalize list envelope: { items, total } or legacy array
        const body = res.data;
        if (Array.isArray(body)) return { ...res, data: body };
        if (body?.items) return { ...res, data: body.items, meta: body };
        if (Array.isArray(body?.data)) return { ...res, data: body.data };
        return { ...res, data: [] };
      }),
    { params }
  );

export const markAlertRead = (alertId) =>
  withApiErrorHandling("markAlertRead", () => api.put(`/alerts/${alertId}/read`), { alertId });

export const markAllAlertsRead = () =>
  withApiErrorHandling("markAllAlertsRead", () => api.post("/alerts/mark-all-read"));

export const getAlert = (alertId) =>
  withApiErrorHandling("getAlert", () => api.get(`/alerts/${alertId}`), { alertId });

/** @deprecated Use notificationService.fetchNotifications */
export const getNotifications = () => fetchNotifications();

/** @deprecated Use notificationService.markNotificationRead / markAllNotificationsRead */
export const markNotificationsRead = (notificationIds = null) => {
  if (!notificationIds?.length) return markAllNotificationsRead();
  return markNotificationRead(notificationIds[0]);
};

/** @deprecated Use notificationService.clearAllNotifications */
export const clearNotifications = () => clearAllNotifications();

export const syncLowStockAlerts = () =>
  withApiErrorHandling(
    "syncLowStockAlerts",
    () => api.post("/alerts/sync-low-stock")
  );

export const createAlert = (payload) =>
  withApiErrorHandling(
    "createAlert",
    () => api.post("/alerts", payload),
    { payload }
  );

export const acknowledgeAlert = (alertId) =>
  withApiErrorHandling(
    "acknowledgeAlert",
    () => api.put(`/alerts/${alertId}/acknowledge`),
    { alertId }
  );

export const resolveAlert = (alertId) =>
  withApiErrorHandling(
    "resolveAlert",
    () => api.put(`/alerts/${alertId}/resolve`),
    { alertId }
  );

export const deleteAlert = (alertId) =>
  withApiErrorHandling(
    "deleteAlert",
    () => api.delete(`/alerts/${alertId}`),
    { alertId }
  );
