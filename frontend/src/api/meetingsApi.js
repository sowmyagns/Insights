import api from "./axiosConfig";

export const getMeetings = (params = {}) => api.get("/meetings", { params });

export const getMeeting = (id) => api.get(`/meetings/${id}`);

export const createMeeting = (payload) => api.post("/meetings", payload);

export const updateMeeting = (id, payload) => api.put(`/meetings/${id}`, payload);

export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);

export const createMeetingGoogleMeet = (id) => api.post(`/meetings/${id}/google-meet`);

export const getGoogleCalendarStatus = () =>
  api.get("/integrations/google/calendar/status");

export const connectGoogleCalendar = () =>
  api.get("/integrations/google/calendar/connect");

export const disconnectGoogleCalendar = () =>
  api.delete("/integrations/google/calendar/disconnect");
