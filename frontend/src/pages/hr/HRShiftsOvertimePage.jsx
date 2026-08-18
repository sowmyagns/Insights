import { useState, useEffect } from "react";
import { api } from "../api";
import ShiftsOvertime from "./ShiftsOveryime";

export default function HRShiftsOvertimePage() {
  const [employees, setEmployees] = useState([]);
  useEffect(() => { api.employees.list().then(setEmployees).catch(() => {}); }, []);
  return <ShiftsOvertime employees={employees} apiMode={true} initialTab="Shifts" />;
}
