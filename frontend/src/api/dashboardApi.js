import api from "./axiosConfig";

function unwrap(res) {
  const body = res?.data;
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return { ...res, data: body.data };
  }
  return res;
}

async function apiGet(url, config) {
  try {
    return unwrap(await api.get(url, config));
  } catch (error) {
    console.error("[dashboardApi.apiGet] Error in GET request:", error.message, { url });
    throw error;
  }
}

export async function getErpDashboard() {
  return apiGet("/api/erp/dashboard");
}

export async function getDashboardSummary() {
  return apiGet("/api/dashboard/summary");
}
