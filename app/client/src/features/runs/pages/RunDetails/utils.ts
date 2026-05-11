import type { RunArtifact } from "@/api/services/runs";

import { ARTIFACT_LABELS, STEP_LABELS, STEP_PROGRESS } from "./constants";

export function formatStep(step: string | null): string {
  return step ? STEP_LABELS[step] || step : "Ожидаем статус пайплайна";
}

export function getProgress(step: string | null, status: string): number {
  if (status === "completed") return 100;
  if (status === "failed") return 100;
  return step ? STEP_PROGRESS[step] || 12 : 12;
}

export function formatArtifactType(artifact: RunArtifact): string {
  return ARTIFACT_LABELS[artifact.type] || artifact.type;
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

export function shortenArtifactPath(fullPath: string): string {
  const runsIndex = fullPath.indexOf("/runs/");
  if (runsIndex === -1) return fullPath;
  return fullPath.slice(runsIndex + 6);
}
