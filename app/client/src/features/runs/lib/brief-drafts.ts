import type {
  BriefClarificationAnswer,
  ClarifyBriefResponse,
} from "@/api/services/runs";

export type DraftAnswerMap = Record<string, string | string[] | number | boolean>;

export interface BriefDraft {
  id: string;
  title: string | null;
  rawBrief: string;
  finalBrief: string | null;
  clarification: ClarifyBriefResponse | null;
  answers: BriefClarificationAnswer[];
  answerMap: DraftAnswerMap;
  isHistoryExpanded: boolean;
  createdAt: string;
  updatedAt: string;
}

const BRIEF_DRAFTS_STORAGE_KEY = "new-run-brief-drafts";
const LEGACY_BRIEF_DRAFT_STORAGE_KEY = "new-run-brief-draft";

export function createBriefDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeDraft(value: Partial<BriefDraft>): BriefDraft {
  const now = new Date().toISOString();

  return {
    id: typeof value.id === "string" ? value.id : createBriefDraftId(),
    title: typeof value.title === "string" ? value.title : null,
    rawBrief: typeof value.rawBrief === "string" ? value.rawBrief : "",
    finalBrief: typeof value.finalBrief === "string" ? value.finalBrief : null,
    clarification: value.clarification ?? null,
    answers: Array.isArray(value.answers) ? value.answers : [],
    answerMap:
      value.answerMap && typeof value.answerMap === "object"
        ? (value.answerMap as DraftAnswerMap)
        : {},
    isHistoryExpanded: Boolean(value.isHistoryExpanded),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

function readLegacyDraft(): BriefDraft[] {
  const legacyDraft = localStorage.getItem(LEGACY_BRIEF_DRAFT_STORAGE_KEY);
  if (!legacyDraft) return [];

  try {
    const parsed = JSON.parse(legacyDraft) as Partial<BriefDraft>;
    localStorage.removeItem(LEGACY_BRIEF_DRAFT_STORAGE_KEY);
    return [normalizeDraft(parsed)];
  } catch {
    localStorage.removeItem(LEGACY_BRIEF_DRAFT_STORAGE_KEY);
    return [];
  }
}

export function readBriefDrafts() {
  try {
    const legacyDrafts = readLegacyDraft();
    const drafts = localStorage.getItem(BRIEF_DRAFTS_STORAGE_KEY);
    const parsedDrafts = drafts
      ? (JSON.parse(drafts) as Partial<BriefDraft>[])
      : [];
    const normalizedDrafts = Array.isArray(parsedDrafts)
      ? parsedDrafts.map(normalizeDraft)
      : [];
    const mergedDrafts = [...normalizedDrafts, ...legacyDrafts];
    const sortedDrafts = mergedDrafts.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );

    if (legacyDrafts.length > 0) {
      localStorage.setItem(BRIEF_DRAFTS_STORAGE_KEY, JSON.stringify(sortedDrafts));
    }

    return sortedDrafts;
  } catch {
    localStorage.removeItem(BRIEF_DRAFTS_STORAGE_KEY);
    return readLegacyDraft();
  }
}

export function readBriefDraft(id: string) {
  return readBriefDrafts().find((draft) => draft.id === id) ?? null;
}

export function saveBriefDraft(draft: BriefDraft) {
  const drafts = readBriefDrafts();
  const nextDraft = normalizeDraft({
    ...draft,
    updatedAt: new Date().toISOString(),
  });
  const nextDrafts = [
    nextDraft,
    ...drafts.filter((item) => item.id !== nextDraft.id),
  ];

  localStorage.setItem(BRIEF_DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
  return nextDraft;
}

export function deleteBriefDraft(id: string) {
  const drafts = readBriefDrafts().filter((draft) => draft.id !== id);
  localStorage.setItem(BRIEF_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}
