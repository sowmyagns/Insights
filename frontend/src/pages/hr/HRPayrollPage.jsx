import { useState, useEffect } from "react";
import { api } from "../api";
import Payroll from "./Payroll";

export default function HRPayrollPage() {
  const [employees, setEmployees] = useState([]);
  useEffect(() => { api.employees.list().then(setEmployees).catch(() => {}); }, []);
  return <Payroll employees={employees} apiMode={true} />;
}
