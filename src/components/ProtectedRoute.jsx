import { Navigate } from "react-router-dom";
import { getItem } from "../utils/storage.js";

/**
 * ProtectedRoute — wraps a page and enforces two things:
 *  1. The user must be logged in (valid token + stored user object).
 *  2. If `allowedRoles` is provided, the user's role must be in that list.
 *
 * On failure it redirects to /login instead of rendering the page,
 * so directly typing /admin, /approver, or /dashboard in the URL bar
 * never shows protected content to an unauthenticated visitor.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = getItem("token");
  const userRaw = getItem("user");

  // Not logged in at all — send to login
  if (!token || !userRaw) {
    return <Navigate to="/login" replace />;
  }

  // Malformed user object — clear and send to login
  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return <Navigate to="/login" replace />;
  }

  // Role check — if the route requires specific roles, enforce them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard instead of a blank page
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "student") return <Navigate to="/dashboard" replace />;
    return <Navigate to="/approver" replace />;
  }

  return children;
}
