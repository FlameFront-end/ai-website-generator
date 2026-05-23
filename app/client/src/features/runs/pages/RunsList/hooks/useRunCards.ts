import { useState } from "react";

import { toast } from "react-toastify";

import {
  useDeleteRunMutation,
  useRunsQuery,
  useUpdateRunMutation,
  useUpdateRunPinnedMutation,
} from "@/api/services/runs";
import type { Run } from "@/api/services/runs";

import {
  deleteBriefDraft,
  readBriefDrafts,
  saveBriefDraft,
  type BriefDraft,
} from "../../../lib/brief-drafts";
import { getRunTitle } from "../../../lib/run-title";
import {
  getDraftCardId,
  getDraftTitle,
  readPinnedDraftIds,
  savePinnedDraftIds,
  sortDrafts,
  sortRuns,
} from "../../../lib/runs-list-helpers";

export type EditableCard =
  | { type: "run"; run: Run }
  | { type: "draft"; draft: BriefDraft };

export function useRunCards() {
  const runsQuery = useRunsQuery();
  const deleteRunMutation = useDeleteRunMutation();
  const updateRunMutation = useUpdateRunMutation();
  const updateRunPinnedMutation = useUpdateRunPinnedMutation();

  const [runToDelete, setRunToDelete] = useState<Run | null>(null);
  const [drafts, setDrafts] = useState<BriefDraft[]>(() => readBriefDrafts());
  const [pinnedDraftIds, setPinnedDraftIds] = useState<Set<string>>(
    () => new Set(readPinnedDraftIds()),
  );
  const [cardToRename, setCardToRename] = useState<EditableCard | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();

  const filteredRuns = sortRuns(
    runsQuery.data?.filter((run) => {
      if (!query) return true;
      return [getRunTitle(run), run.status, run.id, run.slug]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    }) ?? [],
  );

  const filteredDrafts = sortDrafts(
    drafts.filter((draft) => {
      if (!query) return true;
      return [getDraftTitle(draft), draft.rawBrief, draft.finalBrief, "черновик"]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    }),
    pinnedDraftIds,
  );

  const hasItems = Boolean(filteredDrafts.length || filteredRuns.length);

  const confirmDeleteRun = () => {
    if (!runToDelete) return;
    deleteRunMutation.mutate(runToDelete.id, {
      onSuccess: () => {
        setRunToDelete(null);
        toast.success("Проект удален");
      },
      onError: () => toast.error("Не удалось удалить проект"),
    });
  };

  const handleDeleteDraft = (draftId: string) => {
    deleteBriefDraft(draftId);
    setDrafts((current) => current.filter((d) => d.id !== draftId));
    toast.success("Черновик удален");
  };

  const toggleDraftPinned = (draftId: string) => {
    setPinnedDraftIds((current) => {
      const next = new Set(current);
      const cardId = getDraftCardId(draftId);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      savePinnedDraftIds([...next]);
      return next;
    });
  };

  const toggleRunPinned = (run: Run) => {
    updateRunPinnedMutation.mutate(
      { runId: run.id, isPinned: !run.isPinned },
      { onError: () => toast.error("Не удалось обновить закрепление") },
    );
  };

  const openRename = (card: EditableCard) => {
    setCardToRename(card);
    setRenameValue(
      card.type === "run" ? getRunTitle(card.run) : getDraftTitle(card.draft),
    );
  };

  const handleRename = () => {
    if (!cardToRename) return;
    const title = renameValue.trim();
    if (!title) {
      toast.error("Введите название");
      return;
    }

    if (cardToRename.type === "draft") {
      const nextDraft = { ...cardToRename.draft, title };
      saveBriefDraft(nextDraft);
      setDrafts((current) =>
        current.map((d) => (d.id === nextDraft.id ? nextDraft : d)),
      );
      setCardToRename(null);
      toast.success("Название обновлено");
      return;
    }

    updateRunMutation.mutate(
      { runId: cardToRename.run.id, displayName: title },
      {
        onSuccess: () => {
          setCardToRename(null);
          toast.success("Название обновлено");
        },
        onError: () => toast.error("Не удалось обновить название"),
      },
    );
  };

  const isDraftPinned = (draftId: string) =>
    pinnedDraftIds.has(getDraftCardId(draftId));

  return {
    runsQuery,
    drafts,
    filteredRuns,
    filteredDrafts,
    hasItems,
    searchQuery,
    setSearchQuery,

    runToDelete,
    setRunToDelete,
    confirmDeleteRun,
    isDeletingRun: deleteRunMutation.isPending,

    handleDeleteDraft,
    toggleDraftPinned,
    toggleRunPinned,
    isDraftPinned,

    cardToRename,
    setCardToRename,
    renameValue,
    setRenameValue,
    openRename,
    handleRename,
    isRenaming: updateRunMutation.isPending,
  };
}
