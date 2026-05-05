import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

interface PublicRouteProps {
  onlyPublic?: boolean;
}


const PublicRoute = ({ onlyPublic = false }: PublicRouteProps) => {
  const { user } = useAuth();

  if (onlyPublic && user) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};

export default PublicRoute;
