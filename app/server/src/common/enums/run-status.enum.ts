export enum RunStatus {
  Queued = 'queued',
  Running = 'running',
  ReferenceFailed = 'reference_failed',
  BuildFailed = 'build_failed',
  VisualFailed = 'visual_failed',
  NeedsManualReview = 'needs_manual_review',
  Completed = 'completed',
  Failed = 'failed',
  AwaitingStyleSelection = 'awaiting_style_selection',
  AwaitingReferenceApproval = 'awaiting_reference_approval',
  AwaitingFinalApproval = 'awaiting_final_approval',
}
