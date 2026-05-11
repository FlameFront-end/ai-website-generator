export type RunStatus =
  | "queued"
  | "running"
  | "reference_failed"
  | "build_failed"
  | "visual_failed"
  | "needs_manual_review"
  | "completed"
  | "failed";

export interface RunArtifact {
  id: string;
  type: string;
  path: string;
  mimeType: string | null;
  createdAt: string;
}

export interface ArtifactContent {
  artifactId: string;
  type: string;
  path: string;
  mimeType: string | null;
  content: string;
}

export interface RunLog {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Run {
  id: string;
  slug: string;
  displayName: string | null;
  brief: string;
  status: RunStatus;
  currentStep: string | null;
  score: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  artifacts: RunArtifact[];
  logs: RunLog[];
}

export interface CreateRunRequest {
  brief: string;
}

export interface CreateRunResponse {
  id: string;
  slug: string;
  status: RunStatus;
}

export interface UpdateRunRequest {
  displayName: string | null;
}

export interface DeleteRunResponse {
  id: string;
  deleted: boolean;
}

export interface CodeFile {
  path: string;
  size: number;
}

export interface CodeFileContent {
  path: string;
  content: string;
  mimeType: string;
}
