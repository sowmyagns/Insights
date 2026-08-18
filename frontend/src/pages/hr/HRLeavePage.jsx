import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Leave from "./Leave";

export default function HRLeavePage() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);

  const load = useCallback(() => {
    api.employees.list().then(setEmployees).catch(() => {});
    api.leaves.list().then(setLeaves).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Leave
      employees={employees}
      leaves={leaves}
      setLeaves={setLeaves}
      apiMode={true}
      refreshFromApi={load}
    />
  );
}
