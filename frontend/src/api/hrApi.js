import api from "./axiosConfig";

export const getHrDashboard = () => api.get("/hr/dashboard");
export const getHRHub = () => api.get("/hr/hub");

export const getEmployees = () => api.get("/hr/employees");
export const getEmployeeSummary = () => api.get("/hr/employees/summary");
export const getEmployeesEnriched = () => api.get("/hr/employees/enriched");
export const createEmployee = (payload) => api.post("/hr/employees", payload);

export const getShifts = () => api.get("/hr/shifts");
export const createShift = (payload) => api.post("/hr/shifts", payload);

export const getAttendance = (params = {}) => api.get("/hr/attendance", { params });
export const getAttendanceSummary = (params = {}) => api.get("/hr/attendance/summary", { params });
export const getAttendanceEnriched = (params = {}) => api.get("/hr/attendance/enriched", { params });
export const createAttendance = (payload) => api.post("/hr/attendance", payload);
export const clockIn = (_tenantId, employeeId, recordDate) =>
  api.post("/hr/attendance/clock-in", null, { params: { employee_id: employeeId, record_date: recordDate } });
export const clockOut = (_tenantId, employeeId, recordDate) =>
  api.post("/hr/attendance/clock-out", null, { params: { employee_id: employeeId, record_date: recordDate } });

export const getPayroll = (params = {}) => api.get("/hr/payroll", { params });
export const getPayrollSummary = () => api.get("/hr/payroll/summary");
export const getPayrollEnriched = () => api.get("/hr/payroll/enriched");
export const createPayroll = (payload) => api.post("/hr/payroll", payload);
export const updatePayrollStatus = (id, status) => api.patch(`/hr/payroll/${id}/status`, null, { params: { status } });

export const getPerformanceReviews = (_tenantId, employeeId = null) =>
  api.get("/hr/performance", { params: { employee_id: employeeId } });
export const createPerformanceReview = (payload) => api.post("/hr/performance", payload);

export const getLeaveRequests = (params = {}) => api.get("/hr/leave", { params });
export const getLeaveSummary = () => api.get("/hr/leave/summary");
export const getLeaveEnriched = () => api.get("/hr/leave/enriched");
export const createLeaveRequest = (payload) => api.post("/hr/leave", payload);
export const updateLeaveRequest = (leaveId, payload) => api.patch(`/hr/leave/${leaveId}`, payload);

export const getHrAssets = () => api.get("/hr/assets");
export const createHrAsset = (payload) => api.post("/hr/assets", payload);
export const updateHrAsset = (assetId, payload) => api.put(`/hr/assets/${assetId}`, payload);
export const deleteHrAsset = (assetId) => api.delete(`/hr/assets/${assetId}`);

export const getSafetyIncidents = () => api.get("/hr/incidents");
export const createSafetyIncident = (payload) => api.post("/hr/incidents", payload);
export const updateSafetyIncident = (incidentId, payload) =>
  api.put(`/hr/incidents/${incidentId}`, payload);
export const deleteSafetyIncident = (incidentId) => api.delete(`/hr/incidents/${incidentId}`);

export const getDepartments = () => api.get("/hr/departments");
export const getDepartmentSummary = () => api.get("/hr/departments/summary");
export const getDepartmentDetail = (departmentId) => api.get(`/hr/departments/${departmentId}`);
export const createDepartment = (payload) => api.post("/hr/departments", payload);
export const updateDepartment = (departmentId, payload) => api.put(`/hr/departments/${departmentId}`, payload);
export const deactivateDepartment = (departmentId) => api.patch(`/hr/departments/${departmentId}/deactivate`);

export const getRecruitmentDashboard = (params = {}) =>
  api.get("/hr/recruitment/dashboard", { params });
export const getRecruitmentJobs = (params = {}) => api.get("/hr/recruitment/jobs", { params });
export const getRecruitmentJob = (jobId) => api.get(`/hr/recruitment/jobs/${jobId}`);
export const createRecruitmentJob = (payload) => api.post("/hr/recruitment/jobs", payload);
export const updateRecruitmentJob = (jobId, payload) => api.put(`/hr/recruitment/jobs/${jobId}`, payload);
export const updateRecruitmentJobStatus = (jobId, status) =>
  api.patch(`/hr/recruitment/jobs/${jobId}/status`, null, { params: { status } });
export const deleteRecruitmentJob = (jobId) => api.delete(`/hr/recruitment/jobs/${jobId}`);

export const getRecruitmentApplicants = (params = {}) =>
  api.get("/hr/recruitment/applicants", { params });
export const getRecruitmentApplicant = (applicantId) =>
  api.get(`/hr/recruitment/applicants/${applicantId}`);
export const createRecruitmentApplicant = (payload) => api.post("/hr/recruitment/applicants", payload);
export const updateRecruitmentApplicant = (applicantId, payload) =>
  api.put(`/hr/recruitment/applicants/${applicantId}`, payload);
export const updateRecruitmentApplicantStatus = (applicantId, status) =>
  api.patch(`/hr/recruitment/applicants/${applicantId}/status`, null, { params: { status } });
export const deleteRecruitmentApplicant = (applicantId) =>
  api.delete(`/hr/recruitment/applicants/${applicantId}`);

export const getTrainingDashboard = (params = {}) => api.get("/hr/training/dashboard", { params });
export const getTrainingPrograms = (params = {}) => api.get("/hr/training/programs", { params });
export const getTrainingProgram = (programId) => api.get(`/hr/training/programs/${programId}`);
export const createTrainingProgram = (payload) => api.post("/hr/training/programs", payload);
export const updateTrainingProgram = (programId, payload) =>
  api.put(`/hr/training/programs/${programId}`, payload);
export const updateTrainingProgramStatus = (programId, status) =>
  api.patch(`/hr/training/programs/${programId}/status`, null, { params: { status } });
export const deleteTrainingProgram = (programId) => api.delete(`/hr/training/programs/${programId}`);

export const createTrainingEnrollment = (payload) => api.post("/hr/training/enrollments", payload);
export const updateTrainingEnrollment = (enrollmentId, payload) =>
  api.put(`/hr/training/enrollments/${enrollmentId}`, payload);
export const deleteTrainingEnrollment = (enrollmentId) =>
  api.delete(`/hr/training/enrollments/${enrollmentId}`);
