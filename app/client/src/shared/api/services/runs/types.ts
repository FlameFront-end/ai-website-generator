export type RunStatus =
  | "queued"
  | "running"
  | "reference_failed"
  | "build_failed"
  | "visual_failed"
  | "needs_manual_review"
  | "completed"
  | "failed"
  | "awaiting_style_selection"
  | "awaiting_reference_approval"
  | "awaiting_final_approval";

export type PipelineStep =
  | "queued"
  | "prepare_brief"
  | "generate_style_variants"
  | "awaiting_style_selection"
  | "prepare_reference_image"
  | "reference_ready"
  | "awaiting_reference_approval"
  | "prepare_frontend_project"
  | "generate_code"
  | "build_project"
  | "build"
  | "built"
  | "build_success"
  | "build_failed"
  | "take_screenshots"
  | "screenshots_ready"
  | "screenshots_failed"
  | "visual_qa"
  | "visual_qa_failed"
  | "awaiting_final_approval"
  | "frontend_project_ready"
  | "completed"
  | "pipeline_failed";

export interface StyleVariant {
  id: string;
  name: string;
  description: string;
  visualStyle: string;
  colorPalette: string[];
  typographyStyle: string;
  layoutStyle: string;
  moodKeywords: string[];
}

export interface StyleVariantsResponse {
  variants: StyleVariant[];
}

export interface SelectStyleRequest {
  styleVariantId: string;
}

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

export interface RunStatusResponse {
  id: string;
  status: RunStatus;
  currentStep: string | null;
  updatedAt: string;
}

export interface RunActionResponse {
  id: string;
  status: RunStatus;
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
  skipped?: boolean;
}

export interface ClarifyBriefAnswerPayload {
  questionId: string;
  question: string;
  value: string | string[] | number | boolean;
  skipped?: boolean;
}

export interface ClarifyBriefRequest {
  brief: string;
  siteLanguage?: string;
  answers?: ClarifyBriefAnswerPayload[];
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

export interface ReferenceBlockBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditReferenceBlockRequest {
  artifactId: string;
  bbox: ReferenceBlockBbox;
  instruction: string;
}

export interface EditReferenceBlockResponse {
  id: string;
  status: RunStatus;
  artifactId: string;
  path: string;
  model: string;
}

export interface RunLogsResponse {
  items: RunLog[];
  total: number;
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
