import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { runsApi } from './runs.api'

export const runsQueryKeys = {
  all: ['runs'] as const,
  detail: (id: string) => ['runs', id] as const,
  artifactContent: (runId: string, artifactId: string) => ['runs', runId, 'artifacts', artifactId, 'content'] as const,
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runsApi.createRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all })
    },
  })
}

export function useArtifactContentQuery(runId: string, artifactId?: string) {
  return useQuery({
    queryKey: runsQueryKeys.artifactContent(runId, artifactId ?? ''),
    queryFn: () => runsApi.getArtifactContent(runId, artifactId ?? ''),
    enabled: Boolean(runId && artifactId),
  })
}

export function useUpdateRunMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ runId, displayName }: { runId: string; displayName: string | null }) =>
      runsApi.updateRun(runId, { displayName }),
    onSuccess: run => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all })
      void queryClient.setQueryData(runsQueryKeys.detail(run.id), run)
    },
  })
}

export function useDeleteRunMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runsApi.deleteRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all })
    },
  })
}
