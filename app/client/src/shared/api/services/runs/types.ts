export type RunStatus =
  | "queued"
  | "running"
  | "reference_failed"
  | "build_failed"
  | "visual_failed"
  | "needs_manual_review"
  | "completed"
  | "failed"
  | "awaiting_spec_approval"
  | "awaiting_design_approval"
  | "awaiting_reference_approval"
  | "awaiting_code_approval"
  | "awaiting_final_approval";

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
  isPinned: boolean;
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
  displayName?: string | null;
}

export interface CreateRunResponse {
  id: string;
  slug: string;
  status: RunStatus;
}

export type BriefQuestionType =
  | "text"
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "yes_no";

export interface BriefClarificationQuestion {
  id: string;
  type: BriefQuestionType;
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  suggestedAnswer?: string | string[] | number | boolean;
  min?: number;
  max?: number;
}

export interface BriefClarificationAnswer {
  questionId: string;
  question: string;
  type?: BriefQuestionType;
  description?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  suggestedAnswer?: string | string[] | number | boolean;
  min?: number;
  max?: number;
  value: string | string[] | number | boolean;
}

export interface ClarifyBriefRequest {
  brief: string;
  siteLanguage?: string;
  answers?: BriefClarificationAnswer[];
}

export interface ClarifyBriefResponse {
  status: "needs_clarification" | "ready";
  confidence: number;
  estimatedTotalQuestions?: number;
  missingFields: string[];
  understoodSummary?: string;
  projectTitle?: string;
  questions: BriefClarificationQuestion[];
  finalBrief: string | null;
}

export interface UpdateRunRequest {
  displayName: string | null;
}

export interface UpdateRunPinnedRequest {
  isPinned: boolean;
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
