import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const PrivateRoute = ({ allowedRoles, children }: PrivateRouteProps) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 🔒 Not logged in
  if (!token || !role) {
    return <Navigate to="/" replace />;
  }

  // 🔒 Logged in but role not allowed
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  //Authorized
  return <>{children}</>;
};

export default PrivateRoute;
