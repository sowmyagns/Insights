import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Expenses from "./Expenses";

export default function HRExpensesPage() {
  const [employees, setEmployees] = useState([]);

  const load = useCallback(() => {
    api.employees.list().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  return <Expenses employees={employees} apiMode={true} refreshFromApi={load} />;
}
