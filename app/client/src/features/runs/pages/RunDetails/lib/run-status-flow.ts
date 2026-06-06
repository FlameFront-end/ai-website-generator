import type { RunDetailsTab } from "./types";

export const STATUS_TO_TAB: Partial<Record<string, RunDetailsTab>> = {
  awaiting_style_selection: "style",
  awaiting_reference_approval: "reference",
  awaiting_final_approval: "result",
};

export const RESTARTABLE_STATUSES = new Set<string>([
  "awaiting_style_selection",
  "awaiting_reference_approval",
  "failed",
]);

export const CODE_RESTARTABLE_STATUSES = new Set<string>([
  "awaiting_final_approval",
  "build_failed",
  "visual_failed",
  "needs_manual_review",
  "failed",
  "completed",
]);

export function isRunStatusActive(status?: string | null): boolean {
  return status === "queued" || status === "running";
}

export type ApprovalStep = "style" | "reference" | "code" | "final";

export function getStepFromStatus(status: string): ApprovalStep | null {
  if (status === "awaiting_style_selection") return "style";
  if (status === "awaiting_reference_approval") return "reference";
  if (status === "awaiting_final_approval") return "final";
  return null;
}

export function getEffectiveCurrentStep(
  currentStep: string | null | undefined,
  artifacts: {
    hasStyleVariants: boolean;
    hasReferenceImage: boolean;
    hasFrontendProject: boolean;
  },
): string {
  if (currentStep && currentStep !== "pipeline_failed") {
    return currentStep;
  }

  if (!artifacts.hasStyleVariants) {
    return "queued";
  }

  if (!artifacts.hasReferenceImage) {
    return "awaiting_style_selection";
  }

  if (!artifacts.hasFrontendProject) {
    return "awaiting_reference_approval";
  }

  return "awaiting_final_approval";
}
