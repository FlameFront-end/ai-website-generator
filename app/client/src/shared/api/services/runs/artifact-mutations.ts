import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runsApi } from "./runs-api";
import { runsQueryKeys } from "./query-keys";
import type { EditReferenceBlockRequest } from "./types";

export function useEditReferenceBlockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      runId,
      payload,
    }: {
      runId: string;
      payload: EditReferenceBlockRequest;
    }) => runsApi.editReferenceBlock(runId, payload),
    onSuccess: (_result, { runId }) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
    },
  });
}
