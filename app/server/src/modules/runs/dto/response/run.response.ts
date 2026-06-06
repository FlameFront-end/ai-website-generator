import { ArtifactType, RunStatus } from '../../../../common/enums';
import type {
  RunArtifactEntity,
  RunEntity,
  RunLogEntity,
} from '../../../../db/entities';

export type RunArtifactResponse = Readonly<{
  id: string;
  type: ArtifactType;
  path: string;
  mimeType: string | null;
  createdAt: string;
}>;

export type RunLogResponse = Readonly<{
  id: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}>;

export type RunResponse = Readonly<{
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
  artifacts: RunArtifactResponse[];
  logs: RunLogResponse[];
}>;

export function toRunResponse(run: RunEntity): RunResponse {
  return {
    id: run.id,
    slug: run.slug,
    displayName: run.displayName,
    isPinned: run.isPinned,
    brief: run.brief,
    status: run.status,
    currentStep: run.currentStep,
    score: run.score,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    artifacts: (run.artifacts ?? []).map(toRunArtifactResponse),
    logs: (run.logs ?? []).map(toRunLogResponse),
  };
}

function toRunArtifactResponse(
  artifact: RunArtifactEntity,
): RunArtifactResponse {
  return {
    id: artifact.id,
    type: artifact.type,
    path: artifact.path,
    mimeType: artifact.mimeType,
    createdAt: artifact.createdAt.toISOString(),
  };
}

function toRunLogResponse(log: RunLogEntity): RunLogResponse {
  return {
    id: log.id,
    level: log.level,
    message: log.message,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  };
}
