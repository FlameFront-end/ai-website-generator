import { createBrowserRouter } from 'react-router-dom'

import { AppRoutes } from '@/app/components/AppRoutes'
import { lazyImport } from '@/shared/lib/lazy-import'
import { ROUTES } from '@/shared/model/routes'
import { FullErrorScreen } from '@/shared/widgets/FullErrorScreen'
import { FullScreenLoader } from '@/shared/widgets/FullScreenLoader'

export const router = createBrowserRouter([
  {
    element: <AppRoutes />,
    errorElement: <FullErrorScreen />,
    hydrateFallbackElement: <FullScreenLoader />,
    children: [
      {
        path: ROUTES.RUNS,
        lazy: () => lazyImport(() => import('@/features/runs/pages/RunsList/runs-list.page')),
      },
      {
        path: ROUTES.RUN_DETAILS,
        lazy: () => lazyImport(() => import('@/features/runs/pages/RunDetails/run-details.page')),
      },
      {
        path: '*',
        lazy: () => lazyImport(() => import('@/features/not-found/pages/not-found.page')),
      },
    ],
  },
])
