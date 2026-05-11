import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import { AppRoutes } from "@/app/components/AppRoutes";
import { lazyImport } from "@/shared/lib/lazy-import";
import { useAuth } from "@/shared/model/auth.context";
import { ROUTES } from "@/shared/model/routes";
import { FullErrorScreen } from "@/shared/widgets/FullErrorScreen";
import { FullScreenLoader } from "@/shared/widgets/FullScreenLoader";

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.RUNS} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  // Auth routes WITHOUT Layout (no header, no background)
  {
    element: <PublicOnlyRoute />,
    errorElement: <FullErrorScreen />,
    children: [
      {
        path: ROUTES.LOGIN,
        lazy: () =>
          lazyImport(() => import("@/features/auth/pages/login.page")),
      },
      {
        path: ROUTES.REGISTER,
        lazy: () =>
          lazyImport(() => import("@/features/auth/pages/register.page")),
      },
    ],
  },
  // Protected routes WITH Layout
  {
    element: <AppRoutes />,
    errorElement: <FullErrorScreen />,
    hydrateFallbackElement: <FullScreenLoader />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: ROUTES.RUNS,
            lazy: () =>
              lazyImport(
                () => import("@/features/runs/pages/RunsList/runs-list.page"),
              ),
          },
          {
            path: ROUTES.RUN_DETAILS,
            lazy: () =>
              lazyImport(
                () =>
                  import("@/features/runs/pages/RunDetails/run-details.page"),
              ),
          },
        ],
      },
      // Redirect root to runs (if authenticated) or login
      {
        path: "/",
        element: <RootRedirect />,
      },
      {
        path: "*",
        lazy: () =>
          lazyImport(() => import("@/features/not-found/pages/not-found.page")),
      },
    ],
  },
]);

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? ROUTES.RUNS : ROUTES.LOGIN} replace />;
}
