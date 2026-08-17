import api from "./axiosConfig";

// Tenant is derived from the authenticated admin on the backend; the optional
// argument is kept for backward compatibility but no longer required.

// ----- Users -----
export const getUsers = async () => {
  try {
    return await api.get("/admin/users");
  } catch (error) {
    console.error("[adminApi.getUsers] Error fetching users:", error.message);
    throw error;
  }
};

export const getUser = async (id) => {
  try {
    return await api.get(`/admin/users/${id}`);
  } catch (error) {
    console.error("[adminApi.getUser] Error fetching user:", error.message, { id });
    throw error;
  }
};

export const createUser = async (payload) => {
  try {
    return await api.post("/admin/users", payload);
  } catch (error) {
    console.error("[adminApi.createUser] Error creating user:", error.message, { payload });
    throw error;
  }
};

export const updateUser = async (id, payload) => {
  try {
    return await api.put(`/admin/users/${id}`, payload);
  } catch (error) {
    console.error("[adminApi.updateUser] Error updating user:", error.message, { id, payload });
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    return await api.delete(`/admin/users/${id}`);
  } catch (error) {
    console.error("[adminApi.deleteUser] Error deleting user:", error.message, { id });
    throw error;
  }
};

export const adminResetUserPassword = async (id) => {
  try {
    return await api.post(`/api/users/${id}/reset-password`);
  } catch (error) {
    console.error("[adminApi.adminResetUserPassword] Error resetting user password:", error.message, { id });
    throw error;
  }
};

// ----- Roles -----
export const getRoles = async () => {
  try {
    return await api.get("/admin/roles");
  } catch (error) {
    console.error("[adminApi.getRoles] Error fetching roles:", error.message);
    throw error;
  }
};

export const getRole = async (id) => {
  try {
    return await api.get(`/admin/roles/${id}`);
  } catch (error) {
    console.error("[adminApi.getRole] Error fetching role:", error.message, { id });
    throw error;
  }
};

export const createRole = async (payload) => {
  try {
    return await api.post("/admin/roles", payload);
  } catch (error) {
    console.error("[adminApi.createRole] Error creating role:", error.message, { payload });
    throw error;
  }
};

export const updateRole = async (id, payload) => {
  try {
    return await api.put(`/admin/roles/${id}`, payload);
  } catch (error) {
    console.error("[adminApi.updateRole] Error updating role:", error.message, { id, payload });
    throw error;
  }
};

export const deleteRole = async (id) => {
  try {
    return await api.delete(`/admin/roles/${id}`);
  } catch (error) {
    console.error("[adminApi.deleteRole] Error deleting role:", error.message, { id });
    throw error;
  }
};

// ----- Permission catalogue -----
export const getModules = async () => {
  try {
    return await api.get("/admin/permissions/modules");
  } catch (error) {
    console.error("[adminApi.getModules] Error fetching modules:", error.message);
    throw error;
  }
};

// ----- Activity / access logs -----
export const getAccessLogs = async () => {
  try {
    return await api.get("/admin/access-logs");
  } catch (error) {
    console.error("[adminApi.getAccessLogs] Error fetching access logs:", error.message);
    throw error;
  }
};

export const getPendingApprovals = async () => {
  try {
    return await api.get("/admin/approvals");
  } catch (error) {
    console.error("[adminApi.getPendingApprovals] Error fetching pending approvals:", error.message);
    throw error;
  }
};
