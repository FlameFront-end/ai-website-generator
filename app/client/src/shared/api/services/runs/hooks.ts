import { useMutation, useQuery } from '@tanstack/react-query'

import { runsApi } from './runs.api'

export const runsQueryKeys = {
  all: ['runs'] as const,
  detail: (id: string) => ['runs', id] as const,
}

export function useRunsQuery() {
  return useQuery({
    queryKey: runsQueryKeys.all,
    queryFn: runsApi.getRuns,
  })
}

export function useRunQuery(id: string) {
  return useQuery({
    queryKey: runsQueryKeys.detail(id),
    queryFn: () => runsApi.getRun(id),
    enabled: Boolean(id),
    refetchInterval: query => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'running' ? 2500 : false
    },
  })
}

export function useCreateRunMutation() {
  return useMutation({
    mutationFn: runsApi.createRun,
  })
}
