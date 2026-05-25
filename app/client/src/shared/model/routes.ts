export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  RUNS: "/",
  NEW_RUN: "/new",
  RUN_DETAILS: "/runs/:runId",
  RUN_DETAILS_PREFIX: "/runs/",
  NOT_FOUND: "*",
  runDetails: (runId: string) => `/runs/${encodeURIComponent(runId)}`,
} as const;

const e = encodeURIComponent;

export const API_ENDPOINTS = {
  AUTH_LOGIN: "/auth/login",
  AUTH_REGISTER: "/auth/register",
  AUTH_ME: "/auth/me",
  GENERATE_IMAGE: "/generate-image",
  RUNS: "/runs",
  run: (runId: string) => `/runs/${e(runId)}`,
  rebuildRun: (runId: string) => `/runs/${e(runId)}/rebuild`,
  restartCurrentStep: (runId: string) =>
    `/runs/${e(runId)}/restart-current-step`,
  stopCurrentStep: (runId: string) => `/runs/${e(runId)}/stop-current-step`,
  restartCodeStep: (runId: string) => `/runs/${e(runId)}/restart-code-step`,
  artifactContent: (runId: string, artifactId: string) =>
    `/runs/${e(runId)}/artifacts/${e(artifactId)}/content`,
  artifactFile: (runId: string, artifactId: string) =>
    `/runs/${e(runId)}/artifacts/${e(artifactId)}/file`,
  codeFiles: (runId: string) => `/runs/${e(runId)}/code-files`,
  codeFile: (runId: string) => `/runs/${e(runId)}/code-file`,
  downloadCode: (runId: string) => `/runs/${e(runId)}/download-code`,
  approveStep: (runId: string) => `/runs/${e(runId)}/approve`,
  editRequest: (runId: string) => `/runs/${e(runId)}/edit-request`,
  referenceBlockEdit: (runId: string) =>
    `/runs/${e(runId)}/reference-blocks/edit`,
} as const;
