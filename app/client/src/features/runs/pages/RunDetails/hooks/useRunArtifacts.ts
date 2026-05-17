import { useMemo } from "react";

import type { Run, RunArtifact } from "@/api/services/runs";

type ArtifactType =
  | "style_variants"
  | "style_variant_image"
  | "selected_style"
  | "reference_image"
  | "frontend_project"
  | "build_error"
  | "build_log"
  | "reference_validation"
  | "desktop_screenshot"
  | "mobile_screenshot"
  | "diff_image"
  | "visual_report";

export type RunArtifactsMap = Record<ArtifactType, RunArtifact | undefined> & {
  reference_blocks: RunArtifact[];
  style_variant_images: RunArtifact[];
};

const ARTIFACT_TYPES: ArtifactType[] = [
  "style_variants",
  "style_variant_image",
  "selected_style",
  "reference_image",
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
    map.reference_blocks = (run?.artifacts ?? [])
      .filter((artifact) => artifact.type === "reference_block")
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path));
    map.style_variant_images = (run?.artifacts ?? [])
      .filter((artifact) => artifact.type === "style_variant_image")
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path));
    return map;
  }, [run]);
}
