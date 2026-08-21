import api from "./axiosConfig";

export const getAnnouncements = (month) =>
  api.get("/hr/announcements", { params: month ? { month } : {} });

export const createAnnouncement = (payload) => api.post("/hr/announcements", payload);

export const updateAnnouncement = (id, payload) =>
  api.put(`/hr/announcements/${id}`, payload);

export const deleteAnnouncement = (id) => api.delete(`/hr/announcements/${id}`);
