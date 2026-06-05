import { useEffect } from "react";

import type { ClarifyBriefResponse, BriefClarificationAnswer } from "@/api/services/runs";

import {
  saveBriefDraft,
  type BriefDraft,
  type DraftAnswerMap,
} from "../../../lib/brief-drafts";

interface UseBriefDraftAutosaveOptions {
  draftId: string;
  initialCreatedAt: string | undefined;
  rawBrief: string;
  siteLanguage: string;
  finalBrief: string | null;
  projectTitle: string;
  clarification: ClarifyBriefResponse | null;
  answers: BriefClarificationAnswer[];
  answerMap: DraftAnswerMap;
  isHistoryExpanded: boolean;
  onDraftCreated: () => void;
}

export function useBriefDraftAutosave({
  draftId,
  initialCreatedAt,
  rawBrief,
  siteLanguage,
  finalBrief,
  projectTitle,
  clarification,
  answers,
  answerMap,
  isHistoryExpanded,
  onDraftCreated,
}: UseBriefDraftAutosaveOptions): void {
  useEffect(() => {
    const hasDraft =
      rawBrief.trim() ||
      finalBrief?.trim() ||
      clarification ||
      answers.length > 0 ||
      Object.keys(answerMap).length > 0;

    if (!hasDraft) return;

    onDraftCreated();

    const timer = setTimeout(() => {
      const draft: BriefDraft = {
        id: draftId,
        title: projectTitle.trim() || null,
        rawBrief,
        siteLanguage,
        finalBrief,
        clarification,
        answers,
        answerMap,
        isHistoryExpanded,
        createdAt: initialCreatedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveBriefDraft(draft);
    }, 400);

    return () => clearTimeout(timer);
  }, [
    answerMap,
    answers,
    clarification,
    draftId,
    finalBrief,
    initialCreatedAt,
    isHistoryExpanded,
    onDraftCreated,
    projectTitle,
    rawBrief,
    siteLanguage,
  ]);
}
