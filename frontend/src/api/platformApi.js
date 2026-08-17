import api from "./axiosConfig";

const PLATFORM_TOKEN_KEY = "gns-platform-token";
const PLATFORM_ADMIN_KEY = "gns-platform-admin";

export function getPlatformToken() {
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}

export function setPlatformSession({ access_token, admin }) {
  localStorage.setItem(PLATFORM_TOKEN_KEY, access_token);
  localStorage.setItem(PLATFORM_ADMIN_KEY, JSON.stringify(admin));
}

export function clearPlatformSession() {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  localStorage.removeItem(PLATFORM_ADMIN_KEY);
}

export function getPlatformAdmin() {
  try {
    const raw = localStorage.getItem(PLATFORM_ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function platformHeaders() {
  const token = getPlatformToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function withApiErrorHandling(label, operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    console.error(`[platformApi.${label}] Error performing request:`, error.message, context);
    throw error;
  }
}

export async function superAdminLogin(email, password) {
  return withApiErrorHandling(
    "superAdminLogin",
    async () => {
      const { data } = await api.post("/platform/auth/login", { email, password });
      return data;
    },
    { email }
  );
}

export async function superAdminVerifyOtp(challengeToken, otp) {
  return withApiErrorHandling(
    "superAdminVerifyOtp",
    async () => {
      const { data } = await api.post("/platform/auth/verify-otp", {
        challenge_token: challengeToken,
        otp,
      });
      return data;
    },
    { challengeToken }
  );
}

export async function superAdminResendOtp(challengeToken) {
  return withApiErrorHandling(
    "superAdminResendOtp",
    async () => {
      const { data } = await api.post("/platform/auth/resend-otp", {
        challenge_token: challengeToken,
      });
      return data;
    },
    { challengeToken }
  );
}

export async function getSuperAdminProfile() {
  return withApiErrorHandling(
    "getSuperAdminProfile",
    async () => {
      const { data } = await api.get("/platform/auth/me", { headers: platformHeaders() });
      return data;
    }
  );
}

export async function listCompanies() {
  return withApiErrorHandling(
    "listCompanies",
    async () => {
      const { data } = await api.get("/platform/companies", { headers: platformHeaders() });
      return data;
    }
  );
}

export async function createCompany(payload) {
  return withApiErrorHandling(
    "createCompany",
    async () => {
      const { data } = await api.post("/platform/companies", payload, { headers: platformHeaders() });
      return data;
    },
    { payload }
  );
}

export async function getCompany(tenantId) {
  return withApiErrorHandling(
    "getCompany",
    async () => {
      const { data } = await api.get(`/platform/companies/${tenantId}`, { headers: platformHeaders() });
      return data;
    },
    { tenantId }
  );
}

export async function updateCompany(tenantId, payload) {
  return withApiErrorHandling(
    "updateCompany",
    async () => {
      const { data } = await api.put(`/platform/companies/${tenantId}`, payload, {
        headers: platformHeaders(),
      });
      return data;
    },
    { tenantId, payload }
  );
}

export async function activateCompany(tenantId) {
  return withApiErrorHandling(
    "activateCompany",
    async () => {
      const { data } = await api.post(`/platform/companies/${tenantId}/activate`, null, {
        headers: platformHeaders(),
      });
      return data;
    },
    { tenantId }
  );
}

export async function suspendCompany(tenantId) {
  return withApiErrorHandling(
    "suspendCompany",
    async () => {
      const { data } = await api.post(`/platform/companies/${tenantId}/suspend`, null, {
        headers: platformHeaders(),
      });
      return data;
    },
    { tenantId }
  );
}

export async function deleteCompany(tenantId) {
  return withApiErrorHandling(
    "deleteCompany",
    async () => {
      await api.delete(`/platform/companies/${tenantId}`, { headers: platformHeaders() });
    },
    { tenantId }
  );
}

export async function resetCompanyPassword(tenantId, newPassword) {
  return withApiErrorHandling(
    "resetCompanyPassword",
    async () => {
      const { data } = await api.post(
        `/platform/companies/${tenantId}/reset-password`,
        { new_password: newPassword },
        { headers: platformHeaders() }
      );
      return data;
    },
    { tenantId }
  );
}

export async function listCompanyUsers(tenantId) {
  return withApiErrorHandling(
    "listCompanyUsers",
    async () => {
      const { data } = await api.get(`/platform/companies/${tenantId}/users`, {
        headers: platformHeaders(),
      });
      return data;
    },
    { tenantId }
  );
}

export async function getCompanySubscription(tenantId) {
  return withApiErrorHandling(
    "getCompanySubscription",
    async () => {
      const { data } = await api.get(`/platform/companies/${tenantId}/subscription`, {
        headers: platformHeaders(),
      });
      return data;
    },
    { tenantId }
  );
}

export async function updateCompanyLicense(tenantId, payload) {
  return withApiErrorHandling(
    "updateCompanyLicense",
    async () => {
      const { data } = await api.put(`/platform/companies/${tenantId}/license`, payload, {
        headers: platformHeaders(),
      });
      return data;
    },
    { tenantId, payload }
  );
}
