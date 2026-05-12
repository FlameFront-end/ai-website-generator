import type { Run } from "@/api/services/runs";

export function formatRunTitle(slug: string): string {
  return slug.replace(/^run-(\d+)$/, "Проект $1");
}

export function getRunTitle(run: Pick<Run, "slug" | "displayName">): string {
  return run.displayName || formatRunTitle(run.slug);
}
