import { Navigate } from "react-router-dom";

// Widget customizer has been removed. Redirect to dashboard.
export default function DashboardWidgets() {
  return <Navigate to="/dashboard" replace />;
}
