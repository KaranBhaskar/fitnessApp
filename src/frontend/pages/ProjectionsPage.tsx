import { Navigate } from "react-router-dom";

// Weight projections have been moved into the Progress page.
export function ProjectionsPage() {
  return <Navigate to="/progress" replace />;
}
