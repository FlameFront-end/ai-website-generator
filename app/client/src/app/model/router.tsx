import { createBrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/app/components/AppRoutes";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RootRedirect,
} from "@/app/components/route-guards";
import { lazyImport } from "@/lib";
import { ROUTES } from "@/model";
import { FullErrorScreen, FullScreenLoader } from "@/widgets";

export const router = createBrowserRouter([
  // Public-only routes (no layout)
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
  // Protected routes (with layout)
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
            path: ROUTES.NEW_RUN,
            lazy: () =>
              lazyImport(
                () => import("@/features/runs/pages/NewRun/new-run.page"),
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
