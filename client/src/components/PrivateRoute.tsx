import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const PrivateRoute = ({ allowedRoles, children }: PrivateRouteProps) => {
  const role = localStorage.getItem("role"); // get role from localStorage

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />; // redirect if not allowed
  }

  return <>{children}</>; // render the children (dashboard)
};

export default PrivateRoute;
