import { Navigate, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { Role } from "@/types";

type ProtectedRouteProps = {
  allowedRoles: Role[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && !user) {
    navigate("/login", { replace: true });
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/home" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ProtectedRoute;
