import { useState, useEffect } from "react";
import { api } from "../api";
import SiteVisits from "./SiteVisits";

export default function HRSiteVisitsPage() {
  const [employees, setEmployees] = useState([]);
  useEffect(() => { api.employees.list().then(setEmployees).catch(() => {}); }, []);
  return <SiteVisits employees={employees} apiMode={true} />;
}
