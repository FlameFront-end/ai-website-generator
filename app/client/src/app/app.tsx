import { RouterProvider } from 'react-router-dom'

import { Providers } from './model/providers'
import { router } from './model/router'

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
