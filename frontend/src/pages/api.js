import axiosInstance from "../api/axiosConfig";
const safe = (fn) => fn().catch(() => []);
const safeObj = (fn) => fn().catch(() => ({}));
const list = (url) => () => safe(() => axiosInstance.get(url).then((r) => r.data?.results ?? r.data ?? []));
const listP = (url) => (params) => safe(() => axiosInstance.get(url, { params }).then((r) => r.data?.results ?? r.data ?? []));
export const api = {
  employees:    { list: list("/hr/employees") },
  shifts:       { list: list("/hr/shifts") },
  expenses:     { list: list("/hr/expenses") },
  attendance:   {
    list: listP("/hr/attendance"),
    report: (empId, month) => safe(() => axiosInstance.get("/hr/attendance", { params: { employee_id: empId, month } }).then((r) => r.data?.results ?? r.data ?? [])),
  },
  leaves:       { list: list("/hr/leaves") },
  siteVisits:   { list: list("/hr/site-visits") },
  payroll:      { list: listP("/hr/payroll") },
  departments:  { list: list("/hr/departments") },
  announcements:{ list: list("/hr/announcements") },
  dashboard:    { summary: () => safeObj(() => axiosInstance.get("/hr/dashboard").then((r) => r.data ?? {})) },
  employeeSummary: { get: () => safeObj(() => axiosInstance.get("/hr/employees/summary").then((r) => r.data ?? {})) },
  misReports:   { summary: () => safeObj(() => axiosInstance.get("/hr/mis-reports").then((r) => r.data ?? {})) },
  reports: {
    attendanceExcel: (month) => safe(() => axiosInstance.get("/hr/reports/attendance/export", { params: { month }, responseType: "blob" })),
    payrollExcel:    (month) => safe(() => axiosInstance.get("/hr/reports/payroll/export",    { params: { month }, responseType: "blob" })),
    employeesExcel:  ()      => safe(() => axiosInstance.get("/hr/reports/employees/export",  { responseType: "blob" })),
  },
};


