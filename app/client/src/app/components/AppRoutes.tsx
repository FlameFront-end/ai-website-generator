import { Outlet } from 'react-router-dom'

import { Layout } from '@/shared/widgets/Layout'

export function AppRoutes() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
