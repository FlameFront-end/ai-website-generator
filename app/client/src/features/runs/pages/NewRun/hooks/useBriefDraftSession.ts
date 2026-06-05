import { useCallback, useState } from "react";

import { useSearchParams } from "react-router-dom";

import {
  createBriefDraftId,
  deleteBriefDraft,
  readBriefDraft,
  type BriefDraft,
} from "../../../lib/brief-drafts";

interface UseBriefDraftSessionResult {
  clearDraftSearchParam: () => void;
  deleteCurrentDraft: () => void;
  draftId: string;
  initialDraft: BriefDraft | null;
  persistDraftSearchParam: () => void;
}

export function useBriefDraftSession(
  requestedDraftId: string | null,
): UseBriefDraftSessionResult {
  const [, setSearchParams] = useSearchParams();

  const [initialDraft] = useState(() =>
    requestedDraftId ? readBriefDraft(requestedDraftId) : null,
  );
  const [draftId] = useState(
    () => initialDraft?.id ?? requestedDraftId ?? createBriefDraftId(),
  );

  const persistDraftSearchParam = useCallback(() => {
    if (!requestedDraftId) {
      setSearchParams({ draft: draftId }, { replace: true });
    }
  }, [draftId, requestedDraftId, setSearchParams]);

  const clearDraftSearchParam = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const deleteCurrentDraft = useCallback(() => {
    deleteBriefDraft(draftId);
    clearDraftSearchParam();
  }, [clearDraftSearchParam, draftId]);

  return {
    clearDraftSearchParam,
    deleteCurrentDraft,
    draftId,
    initialDraft,
    persistDraftSearchParam,
  };
}
