export const runsQueryKeys = {
  all: ["runs"] as const,
  detail: (id: string) => ["runs", id] as const,
  status: (id: string) => ["runs", id, "status"] as const,
  logs: (runId: string) => ["runs", runId, "logs"] as const,
  artifactContent: (runId: string, artifactId: string) =>
    ["runs", runId, "artifacts", artifactId, "content"] as const,
  artifactFile: (runId: string, artifactId: string) =>
    ["runs", runId, "artifacts", artifactId, "file"] as const,
  codeFiles: (runId: string) => ["runs", runId, "code-files"] as const,
  codeFileContent: (runId: string, filePath: string) =>
    ["runs", runId, "code-files", filePath] as const,
};
