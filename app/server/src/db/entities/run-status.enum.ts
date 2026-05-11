export enum RunStatus {
  Queued = 'queued',
  Running = 'running',
  ReferenceFailed = 'reference_failed',
  BuildFailed = 'build_failed',
  VisualFailed = 'visual_failed',
  NeedsManualReview = 'needs_manual_review',
  Completed = 'completed',
  Failed = 'failed',
}
