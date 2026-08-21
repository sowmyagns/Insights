import api from "./axiosConfig";

/**
 * ============================================================================
 * AUTH API - Exception Handling Pattern (mirrors backend auth_repository.py)
 * ============================================================================
 * Each function includes:
 * - Try-catch block to catch network/API errors
 * - Console.error logging with function name and parameters
 * - Re-throw error for caller to handle
 */

export async function login(email, password, role) {
  try {
    const { data } = await api.post("/auth/login", { email, password, role });
    return data;
  } catch (error) {
    console.error("[authApi.login] Error logging in user:", error.message, { email, role });
    throw error;
  }
}

export async function phoneLogin(phone, role, idToken = null) {
  const { data } = await api.post("/auth/phone-login", {
    phone,
    role,
    id_token: idToken || undefined,
  });
  return data;
}

export async function getCurrentUser() {
  try {
    const { data } = await api.get("/auth/me");
    return data;
  } catch (error) {
    console.error("[authApi.getCurrentUser] Error fetching current user:", error.message);
    throw error;
  }
}

export async function getProfile() {
  try {
    const { data } = await api.get("/auth/profile");
    return data;
  } catch (error) {
    console.error("[authApi.getProfile] Error fetching user profile:", error.message);
    throw error;
  }
}

export async function register(companyName, fullName, email, password, role = "Admin") {
  try {
    const { data } = await api.post("/auth/register", {
      company_name: companyName,
      full_name: fullName,
      email,
      password,
      role,
    });
    return data;
  } catch (error) {
    console.error("[authApi.register] Error registering new user:", error.message, { email, companyName });
    throw error;
  }
}

export async function getRegisterRoles() {
  try {
    const { data } = await api.get("/roles");
    return data;
  } catch (error) {
    console.error("[authApi.getRegisterRoles] Error fetching register roles:", error.message);
    throw error;
  }
}

export async function getSidebarMenus() {
  try {
    const { data } = await api.get("/sidebar");
    return data;
  } catch (error) {
    console.error("[authApi.getSidebarMenus] Error fetching sidebar menus:", error.message);
    throw error;
  }
}

export async function getSidebarLabels() {
  try {
    const { data } = await api.get("/sidebar/labels");
    return data;
  } catch (error) {
    console.error("[authApi.getSidebarLabels] Error fetching sidebar labels:", error.message);
    throw error;
  }
}

export async function getPermissionsCatalog() {
  try {
    const { data } = await api.get("/permissions");
    return data;
  } catch (error) {
    console.error("[authApi.getPermissionsCatalog] Error fetching permissions catalog:", error.message);
    throw error;
  }
}

export async function getTenantRoles() {
  try {
    const { data } = await api.get("/roles/tenant");
    return data;
  } catch (error) {
    console.error("[authApi.getTenantRoles] Error fetching tenant roles:", error.message);
    throw error;
  }
}

export async function refreshTokens(refreshToken) {
  try {
    const { data } = await api.post("/auth/refresh", { refresh_token: refreshToken });
    return data;
  } catch (error) {
    console.error("[authApi.refreshTokens] Error refreshing tokens:", error.message);
    throw error;
  }
}

export async function logout(refreshToken, { allDevices = false } = {}) {
  try {
    const { data } = await api.post("/auth/logout", {
      refresh_token: refreshToken,
      all_devices: allDevices,
    });
    return data;
  } catch (error) {
    console.error("[authApi.logout] Error logging out user:", error.message, { allDevices });
    throw error;
  }
}

export async function verifyEmail(token) {
  try {
    const { data } = await api.post("/auth/verify-email", { token });
    return data;
  } catch (error) {
    console.error("[authApi.verifyEmail] Error verifying email:", error.message);
    throw error;
  }
}

export async function resendVerification(email) {
  try {
    const { data } = await api.post("/auth/resend-verification", { email });
    return data;
  } catch (error) {
    console.error("[authApi.resendVerification] Error resending verification:", error.message, { email });
    throw error;
  }
}


/** Extract human-readable error from FastAPI or API envelope responses. */
export function getApiErrorMessage(err, fallback = "Something went wrong.") {
  try {
    const data = err?.response?.data;
    const genericServerMessages = [
      "A database error occurred.",
      "Internal server error.",
      "Validation error",
      "Validation failed",
    ];

    if (!data) return fallback;
    if (Array.isArray(data.errors) && data.errors.length) {
      const first = data.errors[0];
      if (typeof first === "string" && first.trim()) return first;
      if (typeof first?.msg === "string" && first.msg.trim()) return first.msg;
    }

    const detail = typeof data.detail === "string" ? data.detail.trim() : "";
    if (detail && !genericServerMessages.includes(detail)) {
      return detail;
    }

    const message = typeof data.message === "string" ? data.message.trim() : "";
    if (message && !genericServerMessages.includes(message)) {
      return message;
    }

    return fallback;
  } catch (error) {
    console.error("[authApi.getApiErrorMessage] Error extracting error message:", error.message);
    return fallback;
  }
}

export async function forgotPassword(email) {
  try {
    const { data } = await api.post("/api/auth/forgot-password", { email });
    return data;
  } catch (error) {
    console.error("[authApi.forgotPassword] Error sending password reset email:", error.message, { email });
    throw error;
  }
}

export async function validateResetToken(token) {
  try {
    const { data } = await api.get("/api/auth/validate-reset-token", {
      params: { token },
    });
    return data;
  } catch (error) {
    console.error("[authApi.validateResetToken] Error validating reset token:", error.message);
    throw error;
  }
}

export async function resetPassword(token, password) {
  try {
    const { data } = await api.post("/api/auth/reset-password", { token, password });
    return data;
  } catch (error) {
    console.error("[authApi.resetPassword] Error resetting password:", error.message);
    throw error;
  }
}
