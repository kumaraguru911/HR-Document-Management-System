import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access_token");
  const storedUser = localStorage.getItem("user");

  // Not logged in
  if (!token || !storedUser) {
    return <Navigate to="/login" replace />;
  }

  let user;

  try {
    user = JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    return <Navigate to="/login" replace />;
  }

  // Logged in, but trying to access another role's page
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === "HR") {
      return <Navigate to="/hr" replace />;
    }

    if (user.role === "EMPLOYEE") {
      return <Navigate to="/employee" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;