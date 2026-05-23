import type { Run } from "@/api/services/runs";
import { pluralize } from "@/lib/pluralize";
import { safeStorage } from "@/lib";

import type { BriefDraft } from "./brief-drafts";
import { stripTechnicalBriefPrefix } from "./brief-display";
import { getStepLabel } from "./pipeline-labels";
import { getRunTitle } from "./run-title";

const PINNED_DRAFTS_STORAGE_KEY = "pinned-draft-cards";

// ── Sorting ─────────────────────────────────────────────────────────

export function sortRuns(runs: Run[]) {
  return [...runs].sort((left, right) => {
    const leftPinned = left.isPinned;
    const rightPinned = right.isPinned;
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

export function sortDrafts(drafts: BriefDraft[], pinnedIds: Set<string>) {
  return [...drafts].sort((left, right) => {
    const leftPinned = pinnedIds.has(getDraftCardId(left.id));
    const rightPinned = pinnedIds.has(getDraftCardId(right.id));
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

// ── Pinned drafts storage ───────────────────────────────────────────

export function getDraftCardId(draftId: string) {
  return `draft:${draftId}`;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string");

export function readPinnedDraftIds(): string[] {
  return safeStorage.getJSON(PINNED_DRAFTS_STORAGE_KEY, isStringArray) ?? [];
}

export function savePinnedDraftIds(ids: string[]) {
  safeStorage.setJSON(PINNED_DRAFTS_STORAGE_KEY, ids);
}

// ── Display helpers ─────────────────────────────────────────────────

export function getDraftTitle(draft: BriefDraft) {
  if (draft.title?.trim()) return draft.title.trim();

  const source = draft.finalBrief ?? draft.rawBrief;
  const firstLine = source
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ?? "Новый проект";
}

export function getBriefPreview(brief: string) {
  const normalized = brief.replace(/\s+/g, " ").trim();
  if (!normalized) return "Описание пока не заполнено.";
  if (normalized.length <= 180) return normalized;

  return `${normalized.slice(0, 180).trim()}...`;
}

function isSameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function getDraftDescription(draft: BriefDraft) {
  const title = getDraftTitle(draft);
  const preview = getBriefPreview(draft.finalBrief ?? draft.rawBrief);

  if (isSameText(title, preview)) return "";
  return preview;
}

export function getRunDescription(run: Run) {
  const title = getRunTitle(run);
  const preview = getBriefPreview(stripTechnicalBriefPrefix(run.brief));

  if (isSameText(title, preview)) return getRunMeta(run);
  return preview;
}

export function getDraftProgress(draft: BriefDraft) {
  if (draft.finalBrief) return "Финальный бриф готов";
  if (draft.answers.length > 0) {
    return `${draft.answers.length} ${pluralize(draft.answers.length, "вопрос", "вопроса", "вопросов")} отвечено`;
  }

  return draft.rawBrief.trim() ? "Исходный бриф заполнен" : "Пустой черновик";
}

export function getRunMeta(run: Run) {
  if (run.currentStep) return getStepLabel(run.currentStep);
  if (run.artifacts.length > 0) {
    return `${run.artifacts.length} ${pluralize(run.artifacts.length, "артефакт", "артефакта", "артефактов")}`;
  }
  if (run.score !== null) return `Оценка ${Math.round(run.score)}%`;

  return run.slug;
}

export { formatDate } from "@/lib/format";
