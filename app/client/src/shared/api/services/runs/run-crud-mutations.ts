import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runsApi } from "./runs-api";
import { runsQueryKeys } from "./query-keys";

export function useCreateRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.createRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all });
    },
  });
}

export function useUpdateRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      runId,
      displayName,
    }: {
      runId: string;
      displayName: string | null;
    }) => runsApi.updateRun(runId, { displayName }),
    onSuccess: (run) => {
      void queryClient.setQueryData(runsQueryKeys.detail(run.id), run);
    },
  });
}

export function useUpdateRunPinnedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, isPinned }: { runId: string; isPinned: boolean }) =>
      runsApi.updateRunPinned(runId, { isPinned }),
    onSuccess: (run) => {
      void queryClient.setQueryData(runsQueryKeys.detail(run.id), run);
    },
  });
}

export function useDeleteRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.deleteRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all });
    },
  });
}
