import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runsApi } from "./runs-api";
import { runsQueryKeys } from "./query-keys";

function invalidateRunAndCode(
  queryClient: ReturnType<typeof useQueryClient>,
  runId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: runsQueryKeys.detail(runId),
  });
  void queryClient.invalidateQueries({
    queryKey: runsQueryKeys.codeFiles(runId),
  });
}

export function useRebuildRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.rebuildRun,
    onSuccess: (_result, runId) => {
      invalidateRunAndCode(queryClient, runId);
    },
  });
}

export function useRestartCurrentStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.restartCurrentStep,
    onSuccess: (_result, runId) => {
      invalidateRunAndCode(queryClient, runId);
    },
  });
}

export function useStopCurrentStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.stopCurrentStep,
    onSuccess: (_result, runId) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
    },
  });
}

export function useRestartCodeStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.restartCodeStep,
    onSuccess: (_result, runId) => {
      invalidateRunAndCode(queryClient, runId);
    },
  });
}
