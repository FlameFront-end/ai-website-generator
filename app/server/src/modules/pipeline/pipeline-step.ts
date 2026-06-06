import { ArtifactType, RunStatus } from '../../common/enums';

export type PipelineStep = 'style' | 'reference' | 'code';
export type ApprovalStep = PipelineStep | 'final';

export type PipelineStepMetadata = Readonly<{
  title: string;
  runningStep: string;
  awaitingStatus: RunStatus;
  awaitingCurrentStep: string;
  cleanupFolders: readonly string[];
  cleanupArtifactTypes: readonly ArtifactType[];
}>;

export const PIPELINE_STEP_METADATA: Readonly<
  Record<PipelineStep, PipelineStepMetadata>
> = {
  style: {
    title: 'Style',
    runningStep: 'generate_style_variants',
    awaitingStatus: RunStatus.AwaitingStyleSelection,
    awaitingCurrentStep: 'awaiting_style_selection',
    cleanupFolders: ['style'],
    cleanupArtifactTypes: [
      ArtifactType.StyleVariants,
      ArtifactType.SelectedStyle,
    ],
  },
  reference: {
    title: 'Visual reference',
    runningStep: 'prepare_reference_image',
    awaitingStatus: RunStatus.AwaitingReferenceApproval,
    awaitingCurrentStep: 'awaiting_reference_approval',
    cleanupFolders: ['reference'],
    cleanupArtifactTypes: [
      ArtifactType.ReferenceImage,
      ArtifactType.ReferenceBlock,
      ArtifactType.ReferenceContextSummary,
      ArtifactType.ReferenceValidation,
    ],
  },
  code: {
    title: 'Website code',
    runningStep: 'prepare_frontend_project',
    awaitingStatus: RunStatus.AwaitingFinalApproval,
    awaitingCurrentStep: 'awaiting_final_approval',
    cleanupFolders: ['code', 'screenshots', 'qa'],
    cleanupArtifactTypes: [
      ArtifactType.CodePlan,
      ArtifactType.CodeContentModule,
      ArtifactType.CodeLayoutModule,
      ArtifactType.CodeSectionsModule,
      ArtifactType.FrontendProject,
      ArtifactType.BuildLog,
      ArtifactType.BuildError,
      ArtifactType.DesktopScreenshot,
      ArtifactType.MobileScreenshot,
      ArtifactType.DiffImage,
      ArtifactType.VisualReport,
    ],
  },
};

export const APPROVAL_STEP_LABELS: Readonly<Record<ApprovalStep, string>> = {
  style: PIPELINE_STEP_METADATA.style.title,
  reference: 'Reference',
  code: 'Code',
  final: 'Final review',
};

export function getPipelineStepMetadata(
  step: PipelineStep,
): PipelineStepMetadata {
  return PIPELINE_STEP_METADATA[step];
}

export function formatApprovalStep(step: ApprovalStep): string {
  return APPROVAL_STEP_LABELS[step];
}

export function inferPipelineStepFromCurrentStep(
  currentStep?: string | null,
): PipelineStep | null {
  if (!currentStep) return null;
  if (currentStep.includes('style')) return 'style';
  if (currentStep.includes('reference')) return 'reference';
  if (
    currentStep.includes('code') ||
    currentStep.includes('frontend') ||
    currentStep.includes('build') ||
    currentStep.includes('screenshot') ||
    currentStep.includes('visual')
  ) {
    return 'code';
  }
  return null;
}
