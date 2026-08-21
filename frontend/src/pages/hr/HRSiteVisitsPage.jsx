import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import SiteVisits from "./SiteVisits";

export default function HRSiteVisitsPage() {
  const [employees, setEmployees] = useState([]);

  const load = useCallback(() => {
    api.employees
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setEmployees(
          list.map((e) => ({
            id: e.id,
            name: e.full_name || e.name || `Employee #${e.id}`,
            department: e.department || "",
            designation: e.designation || "",
          }))
        );
      })
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  return <SiteVisits employees={employees} />;
}
