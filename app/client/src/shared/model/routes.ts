export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  RUNS: "/",
  NEW_RUN: "/new",
  RUN_DETAILS: "/runs/:runId",
  RUN_DETAILS_PREFIX: "/runs/",
  NOT_FOUND: "*",
  runDetails: (runId: string) => `/runs/${runId}`,
} as const;

export const API_ENDPOINTS = {
  AUTH_LOGIN: "/auth/login",
  AUTH_REGISTER: "/auth/register",
  AUTH_ME: "/auth/me",
  GENERATE_IMAGE: "/generate-image",
  RUNS: "/runs",
  run: (runId: string) => `/runs/${runId}`,
  rebuildRun: (runId: string) => `/runs/${runId}/rebuild`,
  restartCurrentStep: (runId: string) => `/runs/${runId}/restart-current-step`,
  restartCodeStep: (runId: string) => `/runs/${runId}/restart-code-step`,
  artifactContent: (runId: string, artifactId: string) =>
    `/runs/${runId}/artifacts/${artifactId}/content`,
  artifactFile: (runId: string, artifactId: string) =>
    `/runs/${runId}/artifacts/${artifactId}/file`,
  artifactFileEncoded: (runId: string, artifactId: string) =>
    `/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(
      artifactId,
    )}/file`,
  codeFiles: (runId: string) => `/runs/${runId}/code-files`,
  codeFile: (runId: string) => `/runs/${runId}/code-file`,
  downloadCode: (runId: string) => `/runs/${runId}/download-code`,
  approveStep: (runId: string) => `/runs/${runId}/approve`,
  editRequest: (runId: string) => `/runs/${runId}/edit-request`,
} as const;
