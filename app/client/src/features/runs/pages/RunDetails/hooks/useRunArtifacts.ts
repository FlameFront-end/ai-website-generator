import { useMemo } from "react";

import type { Run, RunArtifact } from "@/api/services/runs";

type ArtifactType =
  | "project_spec"
  | "reference_image"
  | "design_description"
  | "design_tokens"
  | "frontend_project"
  | "build_error"
  | "build_log"
  | "reference_validation"
  | "desktop_screenshot"
  | "mobile_screenshot"
  | "diff_image"
  | "visual_report";

export type RunArtifactsMap = Record<ArtifactType, RunArtifact | undefined>;

const ARTIFACT_TYPES: ArtifactType[] = [
  "project_spec",
  "reference_image",
  "design_description",
  "design_tokens",
  "frontend_project",
  "build_error",
  "build_log",
  "reference_validation",
  "desktop_screenshot",
  "mobile_screenshot",
  "diff_image",
  "visual_report",
];

export function useRunArtifacts(run: Run | undefined): RunArtifactsMap {
  return useMemo(() => {
    const map = {} as RunArtifactsMap;
    for (const type of ARTIFACT_TYPES) {
      map[type] = run?.artifacts.find((artifact) => artifact.type === type);
    }
    return map;
  }, [run]);
}
