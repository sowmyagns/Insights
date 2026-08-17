import api from "./axiosConfig";

export const getInspections = async () => {
  try {
    return await api.get("/quality/inspection");
  } catch (error) {
    console.error("[qualityApi.getInspections] Error fetching inspections:", error.message);
    throw error;
  }
};

export const createInspection = async (payload) => {
  try {
    return await api.post("/quality/inspection", payload);
  } catch (error) {
    console.error("[qualityApi.createInspection] Error creating inspection:", error.message, { payload });
    throw error;
  }
};

export const getQualityHub = async () => {
  try {
    return await api.get("/quality/hub");
  } catch (error) {
    console.error("[qualityApi.getQualityHub] Error fetching quality hub:", error.message);
    throw error;
  }
};

export const getIncomingSummary = async () => {
  try {
    return await api.get("/quality/incoming/summary");
  } catch (error) {
    console.error("[qualityApi.getIncomingSummary] Error fetching incoming summary:", error.message);
    throw error;
  }
};

export const getIncomingEnriched = async () => {
  try {
    return await api.get("/quality/incoming/enriched");
  } catch (error) {
    console.error("[qualityApi.getIncomingEnriched] Error fetching enriched incoming data:", error.message);
    throw error;
  }
};

export const getProcessSummary = async () => {
  try {
    return await api.get("/quality/process/summary");
  } catch (error) {
    console.error("[qualityApi.getProcessSummary] Error fetching process summary:", error.message);
    throw error;
  }
};

export const getProcessEnriched = async () => {
  try {
    return await api.get("/quality/process/enriched");
  } catch (error) {
    console.error("[qualityApi.getProcessEnriched] Error fetching enriched process data:", error.message);
    throw error;
  }
};

export const getFinalSummary = async () => {
  try {
    return await api.get("/quality/final/summary");
  } catch (error) {
    console.error("[qualityApi.getFinalSummary] Error fetching final summary:", error.message);
    throw error;
  }
};

export const getFinalEnriched = async () => {
  try {
    return await api.get("/quality/final/enriched");
  } catch (error) {
    console.error("[qualityApi.getFinalEnriched] Error fetching enriched final data:", error.message);
    throw error;
  }
};

export const getBatchSummary = async () => {
  try {
    return await api.get("/quality/batch-reports/summary");
  } catch (error) {
    console.error("[qualityApi.getBatchSummary] Error fetching batch summary:", error.message);
    throw error;
  }
};

export const getBatchEnriched = async () => {
  try {
    return await api.get("/quality/batch-reports/enriched");
  } catch (error) {
    console.error("[qualityApi.getBatchEnriched] Error fetching enriched batch reports:", error.message);
    throw error;
  }
};

export const getBatchReports = async () => {
  try {
    return await api.get("/quality/batch-reports");
  } catch (error) {
    console.error("[qualityApi.getBatchReports] Error fetching batch reports:", error.message);
    throw error;
  }
};

export const createBatchReport = async (payload) => {
  try {
    return await api.post("/quality/batch-reports", payload);
  } catch (error) {
    console.error("[qualityApi.createBatchReport] Error creating batch report:", error.message, { payload });
    throw error;
  }
};

export const getDefectSummary = async () => {
  try {
    return await api.get("/quality/defects/summary");
  } catch (error) {
    console.error("[qualityApi.getDefectSummary] Error fetching defect summary:", error.message);
    throw error;
  }
};

export const getDefectsEnriched = async () => {
  try {
    return await api.get("/quality/defects/enriched");
  } catch (error) {
    console.error("[qualityApi.getDefectsEnriched] Error fetching enriched defects:", error.message);
    throw error;
  }
};

export const getDefects = async () => {
  try {
    return await api.get("/quality/defects");
  } catch (error) {
    console.error("[qualityApi.getDefects] Error fetching defects:", error.message);
    throw error;
  }
};

export const createDefect = async (payload) => {
  try {
    return await api.post("/quality/defects", payload);
  } catch (error) {
    console.error("[qualityApi.createDefect] Error creating defect:", error.message, { payload });
    throw error;
  }
};
export const updateDefectStatus = (defectId, status) =>
  api.patch(`/quality/defects/${defectId}/status`, null, { params: { status } });

export const getComplianceLogs = () => api.get("/quality/compliance");
export const createComplianceLog = (payload) => api.post("/quality/compliance", payload);
