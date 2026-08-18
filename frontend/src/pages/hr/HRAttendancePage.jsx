import { useState, useEffect } from "react";
import { api } from "../api";
import Attendance from "./Attendance";

export default function HRAttendancePage() {
  const [employees, setEmployees] = useState([]);
  useEffect(() => { api.employees.list().then(setEmployees).catch(() => {}); }, []);
  return <Attendance employees={employees} apiMode={true} />;
}
