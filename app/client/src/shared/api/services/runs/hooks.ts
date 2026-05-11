import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { runsApi } from "./runs.api";

export const runsQueryKeys = {
  all: ["runs"] as const,
  detail: (id: string) => ["runs", id] as const,
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
  });
}

export function useRunQuery(id: string) {
  return useQuery({
    queryKey: runsQueryKeys.detail(id),
    queryFn: () => runsApi.getRun(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 2500 : false;
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
  });
}

export function useArtifactFileUrl(runId: string, artifactId?: string) {
  const query = useQuery({
    queryKey: runsQueryKeys.artifactFile(runId, artifactId ?? ""),
    queryFn: () => runsApi.getArtifactFile(runId, artifactId ?? ""),
    enabled: Boolean(runId && artifactId),
  });
  const url = useMemo(
    () => (query.data ? window.URL.createObjectURL(query.data) : null),
    [query.data],
  );

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
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.all });
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
  });
}

export function useRebuildRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runsApi.rebuildRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}
