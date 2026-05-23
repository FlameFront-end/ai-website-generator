import type { Run } from "@/api/services/runs";

import type { BriefDraft } from "./brief-drafts";
import { stripTechnicalBriefPrefix } from "./brief-display";
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

export function readPinnedDraftIds(): string[] {
  try {
    const pinnedIds = localStorage.getItem(PINNED_DRAFTS_STORAGE_KEY);
    if (!pinnedIds) return [];

    const parsed = JSON.parse(pinnedIds);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    localStorage.removeItem(PINNED_DRAFTS_STORAGE_KEY);
    return [];
  }
}

export function savePinnedDraftIds(ids: string[]) {
  localStorage.setItem(PINNED_DRAFTS_STORAGE_KEY, JSON.stringify(ids));
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
    return `${draft.answers.length} ${getQuestionWord(draft.answers.length)} отвечено`;
  }

  return draft.rawBrief.trim() ? "Исходный бриф заполнен" : "Пустой черновик";
}

export function getRunMeta(run: Run) {
  if (run.currentStep) return getStepLabel(run.currentStep);
  if (run.artifacts.length > 0) {
    return `${run.artifacts.length} ${getArtifactWord(run.artifacts.length)}`;
  }
  if (run.score !== null) return `Оценка ${Math.round(run.score)}%`;

  return run.slug;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// ── Pluralization ───────────────────────────────────────────────────

function getQuestionWord(count: number) {
  const remainder = count % 10;
  const hundredRemainder = count % 100;

  if (remainder === 1 && hundredRemainder !== 11) return "вопрос";
  if (
    [2, 3, 4].includes(remainder) &&
    ![12, 13, 14].includes(hundredRemainder)
  ) {
    return "вопроса";
  }

  return "вопросов";
}

function getArtifactWord(count: number) {
  const remainder = count % 10;
  const hundredRemainder = count % 100;

  if (remainder === 1 && hundredRemainder !== 11) return "артефакт";
  if (
    [2, 3, 4].includes(remainder) &&
    ![12, 13, 14].includes(hundredRemainder)
  ) {
    return "артефакта";
  }

  return "артефактов";
}

function getStepLabel(step: string) {
  // Lazy import to avoid circular dep — formatStep lives in RunDetails/utils
  // We inline a minimal version here to keep this lib self-contained
  const STEP_LABELS: Record<string, string> = {
    queued: "В очереди",
    prepare_brief: "Подготовка брифа",
    generate_style_variants: "Подбираем визуальные направления",
    awaiting_style_selection: "Выберите визуальный стиль",
    prepare_reference_image: "Подготовка визуального референса",
    prepare_frontend_project: "Генерация клиентского проекта",
    build_project: "Сборка проекта",
    take_screenshots: "Создание скриншотов",
    visual_qa: "Визуальный анализ",
    completed: "Завершено",
    pipeline_failed: "Ошибка пайплайна",
  };

  const label = STEP_LABELS[step];
  if (label) return label;

  const normalized = step.replace(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
