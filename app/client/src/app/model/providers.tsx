import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'

import { queryClient } from '@/shared/api/queryClient'

import 'react-toastify/dist/ReactToastify.css'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer position="top-right" autoClose={4000} pauseOnFocusLoss={false} />
    </QueryClientProvider>
  )
}
