import type {
  BriefClarificationAnswer,
  ClarifyBriefResponse,
} from "@/api/services/runs";
import { safeStorage } from "@/lib";

export type DraftAnswerMap = Record<
  string,
  string | string[] | number | boolean
>;

export interface BriefDraft {
  id: string;
  title: string | null;
  rawBrief: string;
  siteLanguage: string;
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
    siteLanguage:
      typeof value.siteLanguage === "string" ? value.siteLanguage : "ru",
    finalBrief: typeof value.finalBrief === "string" ? value.finalBrief : null,
    clarification: value.clarification ?? null,
    answers: Array.isArray(value.answers) ? value.answers : [],
    answerMap:
      value.answerMap && typeof value.answerMap === "object"
        ? value.answerMap
        : {},
    isHistoryExpanded: Boolean(value.isHistoryExpanded),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

const isPartialDraft = (v: unknown): v is Partial<BriefDraft> =>
  typeof v === "object" && v !== null;

const isPartialDraftArray = (v: unknown): v is Partial<BriefDraft>[] =>
  Array.isArray(v);

function readLegacyDraft(): BriefDraft[] {
  const parsed = safeStorage.getJSON(
    LEGACY_BRIEF_DRAFT_STORAGE_KEY,
    isPartialDraft,
  );
  if (!parsed) return [];

  safeStorage.remove(LEGACY_BRIEF_DRAFT_STORAGE_KEY);
  return [normalizeDraft(parsed)];
}

export function readBriefDrafts() {
  const legacyDrafts = readLegacyDraft();
  const parsedDrafts =
    safeStorage.getJSON(BRIEF_DRAFTS_STORAGE_KEY, isPartialDraftArray) ?? [];
  const normalizedDrafts = parsedDrafts.map(normalizeDraft);
  const mergedDrafts = [...normalizedDrafts, ...legacyDrafts];
  const sortedDrafts = mergedDrafts.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  if (legacyDrafts.length > 0) {
    safeStorage.setJSON(BRIEF_DRAFTS_STORAGE_KEY, sortedDrafts);
  }

  return sortedDrafts;
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

  safeStorage.setJSON(BRIEF_DRAFTS_STORAGE_KEY, nextDrafts);
  return nextDraft;
}

export function deleteBriefDraft(id: string) {
  const drafts = readBriefDrafts().filter((draft) => draft.id !== id);
  safeStorage.setJSON(BRIEF_DRAFTS_STORAGE_KEY, drafts);
}
