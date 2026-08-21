import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Expenses from "./Expenses";

export default function HRExpensesPage() {
  const [employees, setEmployees] = useState([]);

  const load = useCallback(() => {
    api.employees
      .list()
      .then((data) => {
        // API returns full_name; normalize to { id, name } for the Expenses component
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

  return <Expenses employees={employees} apiMode={true} refreshFromApi={load} />;
}
