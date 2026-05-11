import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/lib";
import { ROUTES } from "@/model";
import { FullScreenLoader } from "@/widgets";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to={ROUTES.RUNS} replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return (
    <Navigate to={isAuthenticated ? ROUTES.RUNS : ROUTES.LOGIN} replace />
  );
}
