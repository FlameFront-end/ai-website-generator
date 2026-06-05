import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runsApi } from "./runs-api";
import { runsQueryKeys } from "./query-keys";
import type { SelectStyleRequest } from "./types";

export function useClarifyBriefMutation() {
  return useMutation({
    mutationFn: runsApi.clarifyBrief,
  });
}

export function useApproveStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      runId,
      step,
    }: {
      runId: string;
      step: "style" | "reference" | "code" | "final";
    }) => runsApi.approveStep(runId, step),
    onSuccess: (_result, { runId }) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
    },
  });
}

export function useSelectStyleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      runId,
      payload,
    }: {
      runId: string;
      payload: SelectStyleRequest;
    }) => runsApi.selectStyle(runId, payload),
    onSuccess: (_result, { runId }) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
    },
  });
}
