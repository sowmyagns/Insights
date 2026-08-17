import api from "./axiosConfig";

/**
 * Generic API error handler for business document operations.
 * Logs error details and re-throws for caller to handle.
 */
function withErrorHandling(operation, label) {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message;
      console.error(`[bizDocumentsApi.${label}] Error:`, detail, {
        status: error?.response?.status,
        url: error?.config?.url,
      });
      throw error;
    }
  };
}

export const listBizDocuments = withErrorHandling(
  (params = {}) => api.get("/biz/documents", { params }),
  "listBizDocuments"
);

export const getBizDocument = withErrorHandling(
  (id) => api.get(`/biz/documents/${id}`),
  "getBizDocument"
);

export const createBizDocument = withErrorHandling(
  (payload) => api.post("/biz/documents", payload),
  "createBizDocument"
);

export const updateBizDocument = withErrorHandling(
  (id, payload) => api.put(`/biz/documents/${id}`, payload),
  "updateBizDocument"
);

export const deleteBizDocument = withErrorHandling(
  (id) => api.delete(`/biz/documents/${id}`),
  "deleteBizDocument"
);

export const getPurchaseDocument = withErrorHandling(
  (id) => api.get(`/biz/documents/${id}/document`),
  "getPurchaseDocument"
);

export const downloadPurchasePdf = withErrorHandling(
  (id) => api.get(`/biz/documents/${id}/pdf`, { responseType: "blob" }),
  "downloadPurchasePdf"
);

export const getEwaybillStatus = withErrorHandling(
  () => api.get("/biz/ewaybill/status"),
  "getEwaybillStatus"
);

export const ewaybillLogin = withErrorHandling(
  (payload) => api.post("/biz/ewaybill/login", payload),
  "ewaybillLogin"
);

export const ewaybillLogout = withErrorHandling(
  () => api.post("/biz/ewaybill/logout"),
  "ewaybillLogout"
);

export const getEinvoiceStatus = withErrorHandling(
  () => api.get("/biz/einvoice/status"),
  "getEinvoiceStatus"
);
export const einvoiceLogin = (payload) => api.post("/biz/einvoice/login", payload);
export const einvoiceLogout = () => api.post("/biz/einvoice/logout");

export const getDigitalSignatureStatus = () =>
  api.get("/biz/digital-signature/status");
export const setupDigitalSignature = (payload) =>
  api.post("/biz/digital-signature/setup", payload);

export const getFeatureSetting = (key) =>
  api.get(`/biz/feature-settings/${key}`);
export const putFeatureSetting = (key, value) =>
  api.put(`/biz/feature-settings/${key}`, { value });
