import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo } from "react";

import { runsApi } from "./runs-api";

import type { Run, RunStatusResponse } from "./types";

export const runsQueryKeys = {
  all: ["runs"] as const,
  detail: (id: string) => ["runs", id] as const,
  status: (id: string) => ["runs", id, "status"] as const,
  artifactContent: (runId: string, artifactId: string) =>
    ["runs", runId, "artifacts", artifactId, "content"] as const,
  artifactFile: (runId: string, artifactId: string) =>
    ["runs", runId, "artifacts", artifactId, "file"] as const,
  codeFiles: (runId: string) => ["runs", runId, "code-files"] as const,
  codeFileContent: (runId: string, filePath: string) =>
    ["runs", runId, "code-files", filePath] as const,
};

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

export function useCreateRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.createRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all });
    },
  });
}

export function useArtifactContentQuery(runId: string, artifactId?: string) {
  return useQuery({
    queryKey: runsQueryKeys.artifactContent(runId, artifactId ?? ""),
    queryFn: () => runsApi.getArtifactContent(runId, artifactId ?? ""),
    enabled: Boolean(runId && artifactId),
    staleTime: Infinity,
  });
}

export function useArtifactFileUrl(runId: string, artifactId?: string) {
  const query = useQuery({
    queryKey: runsQueryKeys.artifactFile(runId, artifactId ?? ""),
    queryFn: () => runsApi.getArtifactFile(runId, artifactId ?? ""),
    enabled: Boolean(runId && artifactId),
    retry: false,
    staleTime: Infinity,
  });

  const url = useMemo(
    () => (query.data ? window.URL.createObjectURL(query.data) : null),
    [query.data],
  );

  useEffect(() => {
    return () => {
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [url]);

  return { ...query, url };
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

export function useDownloadCodeMutation() {
  return useMutation({
    mutationFn: async (runId: string) => {
      const blob = await runsApi.downloadCode(runId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "frontend-project.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
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

export function useRebuildRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.rebuildRun,
    onSuccess: (_result, runId) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.codeFiles(runId),
      });
    },
  });
}

export function useRestartCurrentStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.restartCurrentStep,
    onSuccess: (_result, runId) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.codeFiles(runId),
      });
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
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      });
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.codeFiles(runId),
      });
    },
  });
}
