import api from "./axiosConfig";

/**
 * Generic API error handler for document operations.
 * Logs error details and re-throws for caller to handle.
 */
function withErrorHandling(operation, label) {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message;
      console.error(`[documentsApi.${label}] Error:`, detail, {
        status: error?.response?.status,
        url: error?.config?.url,
      });
      throw error;
    }
  };
}

export const getDocuments = withErrorHandling(
  (docType = null) =>
    api.get("/documents", { params: docType ? { doc_type: docType } : undefined }),
  "getDocuments"
);

export const getDocument = withErrorHandling(
  (documentId) => api.get(`/documents/${documentId}`),
  "getDocument"
);

export const createDocument = withErrorHandling(
  (payload) => api.post("/documents", payload),
  "createDocument"
);

export const updateDocument = withErrorHandling(
  (documentId, payload) => api.put(`/documents/${documentId}`, payload),
  "updateDocument"
);

export const deleteDocument = withErrorHandling(
  (documentId) => api.delete(`/documents/${documentId}`),
  "deleteDocument"
);
