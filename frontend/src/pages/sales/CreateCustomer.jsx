import { Navigate } from "react-router-dom";

export default function CreateCustomer() {
  return <Navigate to="/masters/customers?create=1" replace />;
}
