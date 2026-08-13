import api from "./axiosConfig";

export const listBizDocuments = (params = {}) =>
  api.get("/biz/documents", { params });

export const getBizDocument = (id) => api.get(`/biz/documents/${id}`);

export const createBizDocument = (payload) =>
  api.post("/biz/documents", payload);

export const updateBizDocument = (id, payload) =>
  api.put(`/biz/documents/${id}`, payload);

export const deleteBizDocument = (id) =>
  api.delete(`/biz/documents/${id}`);

export const getPurchaseDocument = (id) => api.get(`/biz/documents/${id}/document`);
export const downloadPurchasePdf = (id) =>
  api.get(`/biz/documents/${id}/pdf`, { responseType: "blob" });

export const getEwaybillStatus = () => api.get("/biz/ewaybill/status");
export const ewaybillLogin = (payload) => api.post("/biz/ewaybill/login", payload);
export const ewaybillLogout = () => api.post("/biz/ewaybill/logout");

export const getEinvoiceStatus = () => api.get("/biz/einvoice/status");
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
