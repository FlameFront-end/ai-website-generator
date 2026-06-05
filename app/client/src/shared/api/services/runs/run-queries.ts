import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { runsApi } from "./runs-api";
import { runsQueryKeys } from "./query-keys";
import type { Run, RunLogsResponse, RunStatusResponse } from "./types";

export function useRunsQuery() {
  return useQuery({
    queryKey: runsQueryKeys.all,
    queryFn: runsApi.getRuns,
    staleTime: 30_000,
  });
}

export function useRunQuery(id: string) {
  return useQuery({
    queryKey: runsQueryKeys.detail(id),
    queryFn: () => runsApi.getRun(id),
    enabled: Boolean(id),
    retry: (failureCount, error) => {
      if (
        isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 429)
      ) {
        return false;
      }

      return failureCount < 2;
    },
  });
}

export function useRunStatusQuery(id: string) {
  const queryClient = useQueryClient();

  return useQuery<RunStatusResponse>({
    queryKey: runsQueryKeys.status(id),
    queryFn: async () => {
      const status = await runsApi.getRunStatus(id);
      queryClient.setQueryData<Run>(runsQueryKeys.detail(id), (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: status.status,
          currentStep: status.currentStep,
          updatedAt: status.updatedAt,
        };
      });
      if (status.status !== "queued" && status.status !== "running") {
        void queryClient.invalidateQueries({
          queryKey: runsQueryKeys.detail(id),
        });
      }
      return status;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 5000 : false;
    },
  });
}

export function useRunLogsQuery(runId: string, limit = 50, offset = 0) {
  return useQuery<RunLogsResponse>({
    queryKey: [...runsQueryKeys.logs(runId), limit, offset],
    queryFn: () => runsApi.getRunLogs(runId, limit, offset),
    enabled: Boolean(runId),
    staleTime: 10_000,
  });
}

export function useCodeFilesQuery(runId: string, enabled = true) {
  return useQuery({
    queryKey: runsQueryKeys.codeFiles(runId),
    queryFn: () => runsApi.getCodeFiles(runId),
    enabled: Boolean(runId) && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCodeFileContentQuery(
  runId: string,
  filePath: string | null,
) {
  return useQuery({
    queryKey: runsQueryKeys.codeFileContent(runId, filePath ?? ""),
    queryFn: () => runsApi.getCodeFileContent(runId, filePath ?? ""),
    enabled: Boolean(runId && filePath),
    staleTime: Infinity,
  });
}
