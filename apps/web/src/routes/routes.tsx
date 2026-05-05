import { useRoutes, Navigate } from "react-router";
import ProtectedRoute from "@/components/protected-route";
import PublicRoute from "@/components/public-route";
import { LoginForm } from "@/pages/login";
import NotFound from "@/pages/not-found";
import { SignupForm } from "@/pages/signup";
import Profile from "@/pages/profile";
import ForgotPasswordForm from "@/pages/forgot-password";
import ResetPasswordForm from "@/pages/reset-password";
import EmailValidation from "@/pages/validate-email";
import Home from "@/pages/home";
import { Roles } from "@/types";

const allRoutes = () => {
  const publicRoutes = [
    {
      path: "/",
      element: <PublicRoute />,
      children: [
        { path: "/home", element: <Home /> },
      ],
    },
  ];

  const publicOnlyRoutes = [
    {
      path: "/",
      element: <PublicRoute onlyPublic />,
      children: [
        { path: "login", element: <LoginForm /> },
        { path: "signup", element: <SignupForm /> },
        { path: "forgot-password", element: <ForgotPasswordForm /> },
        { path: "reset-password", element: <ResetPasswordForm /> },
        { path: "validate-email", element: <EmailValidation /> },
      ],
    },
  ];

  const privateRoutes = [
    {
      path: "/",
      element: <ProtectedRoute allowedRoles={[Roles.DEFAULT]} />,
      children: [
        { index: true, element: <Navigate to="/home" replace /> },
        { path: "profile", element: <Profile /> },
      ],
    },
  ];

  const notFoundRoute = [{ path: "*", element: <NotFound /> }];

  return [
    ...publicRoutes,
    ...publicOnlyRoutes,
    ...privateRoutes,
    ...notFoundRoute,
  ];
};

export default function Routes() {
  const appRoutes = allRoutes();
  return useRoutes(appRoutes);
}
