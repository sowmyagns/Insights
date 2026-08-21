import axiosInstance from "../api/axiosConfig";
const safe = (fn) => fn().catch(() => []);
const safeObj = (fn) => fn().catch(() => ({}));
const asList = (value) => Array.isArray(value) ? value : [];
const list = (url) => () => safe(() => axiosInstance.get(url).then((r) => asList(r.data?.results ?? r.data)));
const listP = (url) => (params) => safe(() => axiosInstance.get(url, { params }).then((r) => asList(r.data?.results ?? r.data)));
const silentList = (url) => () => safe(() => axiosInstance.get(url, { skipGlobalError: true }).then((r) => asList(r.data?.results ?? r.data)));
const silentSummary = (url) => () => safeObj(() => axiosInstance.get(url, { skipGlobalError: true }).then((r) => r.data ?? {}));
export const api = {
  employees:    { list: list("/hr/employees"), enriched: list("/hr/employees/enriched") },
  shifts:       { list: list("/hr/shifts"), create: (body) => axiosInstance.post("/hr/shifts", body).then(r => r.data) },
  expenses: {
    list: (params = {}) => listP("/hr/expenses")({ year: params.year || new Date().getFullYear() }),
    create: (body) => axiosInstance.post("/hr/expenses", body).then((r) => r.data),
    update: (id, body) => axiosInstance.put(`/hr/expenses/${id}`, body).then((r) => r.data),
    approve: (id, status) => axiosInstance.patch(`/hr/expenses/${id}/status`, { status }).then((r) => r.data),
    delete: (id) => axiosInstance.delete(`/hr/expenses/${id}`).then((r) => r.data),
  },
  attendance: {
    list: listP("/hr/attendance"),
    report: (empId, month) => safe(() => axiosInstance.get("/hr/attendance", { params: { employee_id: empId, month } }).then((r) => r.data?.results ?? r.data ?? [])),
    checkin:  (empId, lat, lng) => axiosInstance.post("/hr/attendance/checkin",  { employee_id: empId, lat, lng }).then(r => r.data).catch(() => null),
    checkout: (empId)           => axiosInstance.post("/hr/attendance/checkout", { employee_id: empId }).then(r => r.data).catch(() => null),
    corrections: {
      list: () => list("/hr/attendance/corrections")(),
      create: (body) => axiosInstance.post("/hr/attendance/corrections", body).then((r) => r.data),
      updateStatus: (id, status) => axiosInstance.patch(`/hr/attendance/corrections/${id}/status`, { status }).then((r) => r.data),
    },
  },
  overtime: {
    list: (params = {}) => listP("/hr/overtime")(params),
    create: (body) => axiosInstance.post("/hr/overtime", body).then((r) => r.data),
    approve: (id, status) => axiosInstance.patch(`/hr/overtime/${id}/status`, { status }).then((r) => r.data),
  },
  leaves: {
    list:    listP("/hr/leaves"),
    apply:   (body) => axiosInstance.post("/hr/leaves", body).then(r => r.data),
    approve: (id, status) => axiosInstance.patch(`/hr/leaves/${id}/approve`, { status }).then(r => r.data),
    delete:  (id) => axiosInstance.delete(`/hr/leaves/${id}`).then(r => r.data).catch(() => null),
  },
  siteVisits: {
    list:   (params = {}) => listP("/hr/site-visits")(params),
    create: (body)        => axiosInstance.post("/hr/site-visits", body).then((r) => r.data),
    update: (id, body)    => axiosInstance.put(`/hr/site-visits/${id}`, body).then((r) => r.data),
    delete: (id)          => axiosInstance.delete(`/hr/site-visits/${id}`).then((r) => r.data),
  },
  payroll: {
    list:      (params = {}) => axiosInstance.get("/hr/payroll", { params }).then((r) => asList(r.data?.results ?? r.data)),
    run:       (body) => axiosInstance.post("/hr/payroll/run", body).then(r => r.data),
    breakdown: (id) => axiosInstance.get(`/hr/payroll/${id}/breakdown`).then(r => r.data).catch(() => null),
    updateStatus: (id, status) => axiosInstance.patch(`/hr/payroll/${id}/status`, { status }).then((r) => r.data),
  },
  salaryBreakups: {
    list: (params = {}) => axiosInstance.get("/hr/salary-breakups", { params }).then((r) => asList(r.data?.results ?? r.data)),
    create: (body) => axiosInstance.post("/hr/salary-breakups", body).then((r) => r.data),
    update: (id, body) => axiosInstance.put(`/hr/salary-breakups/${id}`, body).then((r) => r.data),
    delete: (id) => axiosInstance.delete(`/hr/salary-breakups/${id}`),
  },
  statutory: {
    list: () => axiosInstance.get("/hr/statutory-settings", { skipGlobalError: true }).then((r) => asList(r.data)),
    save: (type, body) => axiosInstance.put(`/hr/statutory-settings/${type}`, body, { skipGlobalError: true }).then((r) => r.data),
  },
  payslips: {
    list: listP("/hr/payslips"),
    breakdown: (id) => axiosInstance.get(`/hr/payroll/${id}/breakdown`).then((r) => r.data),
    byEmployee: (empId) => safe(() => axiosInstance.get("/hr/payslips", { params: { employee_id: empId } }).then(r => r.data?.results ?? r.data ?? [])),
  },
  assets: {
    list: list("/hr/assets"),
    create: (body) => axiosInstance.post("/hr/assets", body).then((r) => r.data),
    update: (id, body) => axiosInstance.put(`/hr/assets/${id}`, body).then((r) => r.data),
    delete: (id) => axiosInstance.delete(`/hr/assets/${id}`).then((r) => r.data),
  },
  announcements:{ list: list("/hr/announcements") },
  dashboard: {
    summary: silentSummary("/hr/dashboard"),
    shifts: silentList("/hr/shifts"),
    leaves: silentList("/hr/leaves"),
    payroll: silentList("/hr/payroll"),
    announcements: silentList("/hr/announcements"),
  },
  employeeSummary: { get: () => safeObj(() => axiosInstance.get("/hr/employees/summary").then((r) => r.data ?? {})) },
  misReports:   { summary: () => safeObj(() => axiosInstance.get("/hr/dashboard").then((r) => r.data ?? {})) },
  reports: {
    attendanceExcel: (month, empId) => axiosInstance.get("/hr/reports/attendance/export", { params: { month, employee_id: empId }, responseType: "blob" }),
    payrollExcel:    (month) => axiosInstance.get("/hr/reports/payroll/export",    { params: { month }, responseType: "blob" }),
    employeesExcel:  ()      => axiosInstance.get("/hr/reports/employees/export",  { responseType: "blob" }),
  },
};


