import api from "./axiosConfig";

export const getFactoryMachineStatus = () =>
  api.get("/factory-monitor/machine-status");

export const getProductionLines = () =>
  api.get("/factory-monitor/production-lines");
