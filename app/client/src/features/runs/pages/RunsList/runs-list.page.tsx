import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  FileText,
  Layers3,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { RunStatusBadge } from "@/features/runs/components/RunStatusBadge";
import {
  useDeleteRunMutation,
  useRunsQuery,
  useUpdateRunPinnedMutation,
  useUpdateRunMutation,
} from "@/api/services/runs";
import type { Run } from "@/api/services/runs";
import { Input, Modal, Spinner } from "@/kit";
import { ROUTES } from "@/model";

import { formatStep } from "../RunDetails/utils";
import {
  deleteBriefDraft,
  readBriefDrafts,
  saveBriefDraft,
  type BriefDraft,
} from "../../lib/brief-drafts";
import { getRunTitle } from "../../lib/run-title";

import styles from "./runs-list.module.scss";

const PINNED_DRAFTS_STORAGE_KEY = "pinned-draft-cards";

type EditableCard =
  | { type: "run"; run: Run }
  | { type: "draft"; draft: BriefDraft };

export default function RunsListPage() {
  const navigate = useNavigate();
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

      return [
        getDraftTitle(draft),
        draft.rawBrief,
        draft.finalBrief,
        "черновик",
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    }),
    pinnedDraftIds,
  );
  const hasItems = Boolean(filteredDrafts.length || filteredRuns.length);

  const handleConfirmDelete = () => {
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
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId),
    );
    toast.success("Черновик удален");
  };

  const toggleDraftPinned = (draftId: string) => {
    setPinnedDraftIds((currentIds) => {
      const nextIds = new Set(currentIds);
      const cardId = getDraftCardId(draftId);
      if (nextIds.has(cardId)) {
        nextIds.delete(cardId);
      } else {
        nextIds.add(cardId);
      }
      savePinnedDraftIds([...nextIds]);
      return nextIds;
    });
  };

  const toggleRunPinned = (run: Run) => {
    updateRunPinnedMutation.mutate(
      { runId: run.id, isPinned: !run.isPinned },
      {
        onError: () => toast.error("Не удалось обновить закрепление"),
      },
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
      setDrafts((currentDrafts) =>
        currentDrafts.map((draft) =>
          draft.id === nextDraft.id ? nextDraft : draft,
        ),
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

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.toolbarSearch}>
          <Search size={15} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск проектов..."
          />
        </label>
        <button type="button" onClick={() => navigate(ROUTES.NEW_RUN)}>
          <Plus size={15} />
          Новый проект
        </button>
      </div>

      <div className={styles.projectsGrid}>
        <aside className={styles.runs}>
          {runsQuery.isLoading && (
            <div className={styles.emptyState}>
              <Spinner size={18} />
              Загружаем проекты...
            </div>
          )}
          {runsQuery.isError && (
            <div className={styles.emptyState}>
              API проектов пока недоступен.
            </div>
          )}
          {runsQuery.data?.length === 0 && drafts.length === 0 && (
            <div className={styles.emptyState}>
              Проектов пока нет. Создайте первый проект.
            </div>
          )}
          {(Boolean(runsQuery.data?.length) || drafts.length > 0) &&
            !hasItems && (
              <div className={styles.emptyState}>
                По запросу «{searchQuery}» ничего не найдено.
              </div>
            )}
          <div className={styles.runsList}>
            {filteredDrafts.map((draft) => (
              <div key={draft.id} className={styles.runItem}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`${styles.runButton} ${styles.draftButton} ${
                    pinnedDraftIds.has(getDraftCardId(draft.id))
                      ? styles.pinnedCard
                      : ""
                  }`}
                  onClick={() =>
                    navigate(`${ROUTES.NEW_RUN}?draft=${draft.id}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`${ROUTES.NEW_RUN}?draft=${draft.id}`);
                    }
                  }}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>
                      {getDraftTitle(draft)}
                    </span>
                    <div className={styles.cardHeaderRight}>
                      <span className={styles.draftBadge}>Черновик</span>
                      <span className={styles.cardActions}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleDraftPinned(draft.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleDraftPinned(draft.id);
                            }
                          }}
                          title={
                            pinnedDraftIds.has(getDraftCardId(draft.id))
                              ? "Открепить"
                              : "Закрепить"
                          }
                          aria-label={
                            pinnedDraftIds.has(getDraftCardId(draft.id))
                              ? "Открепить черновик"
                              : "Закрепить черновик"
                          }
                        >
                          {pinnedDraftIds.has(getDraftCardId(draft.id)) ? (
                            <PinOff size={15} />
                          ) : (
                            <Pin size={15} />
                          )}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            openRename({ type: "draft", draft });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              openRename({ type: "draft", draft });
                            }
                          }}
                          title="Переименовать"
                          aria-label="Переименовать черновик"
                        >
                          <Pencil size={15} />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteDraft(draft.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              handleDeleteDraft(draft.id);
                            }
                          }}
                          title="Удалить черновик"
                          aria-label="Удалить черновик"
                        >
                          <Trash2 size={15} />
                        </span>
                      </span>
                    </div>
                  </div>
                  {getDraftDescription(draft) && (
                    <p className={styles.cardDescription}>
                      {getDraftDescription(draft)}
                    </p>
                  )}
                  <div className={styles.cardMeta}>
                    <span>
                      <FileText size={13} />
                      {getDraftProgress(draft)}
                    </span>
                    <span>
                      <CalendarClock size={13} />
                      Обновлен {formatDate(draft.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredRuns?.map((run) => (
              <div key={run.id} className={styles.runItem}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`${styles.runButton} ${
                    run.isPinned ? styles.pinnedCard : ""
                  }`}
                  onClick={() => navigate(ROUTES.runDetails(run.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(ROUTES.runDetails(run.id));
                    }
                  }}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{getRunTitle(run)}</span>
                    <div className={styles.cardHeaderRight}>
                      <RunStatusBadge status={run.status} />
                      <span className={styles.cardActions}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRunPinned(run);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleRunPinned(run);
                            }
                          }}
                          title={run.isPinned ? "Открепить" : "Закрепить"}
                          aria-label={
                            run.isPinned
                              ? "Открепить проект"
                              : "Закрепить проект"
                          }
                        >
                          {run.isPinned ? (
                            <PinOff size={15} />
                          ) : (
                            <Pin size={15} />
                          )}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            openRename({ type: "run", run });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              openRename({ type: "run", run });
                            }
                          }}
                          title="Переименовать"
                          aria-label="Переименовать проект"
                        >
                          <Pencil size={15} />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            setRunToDelete(run);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              setRunToDelete(run);
                            }
                          }}
                          title="Удалить"
                          aria-label="Удалить проект"
                        >
                          <Trash2 size={15} />
                        </span>
                      </span>
                    </div>
                  </div>
                  <p className={styles.cardDescription}>
                    {getRunDescription(run)}
                  </p>
                  <div className={styles.cardMeta}>
                    <span>
                      <Layers3 size={13} />
                      {getRunMeta(run)}
                    </span>
                    <span>
                      <CalendarClock size={13} />
                      Создан {formatDate(run.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <Modal
          isOpen={!!runToDelete}
          title="Удалить проект?"
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          isLoading={deleteRunMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRunToDelete(null)}
        >
          {runToDelete && (
            <p>
              Проект <strong>«{getRunTitle(runToDelete)}»</strong> и все его
              файлы в папке generated будут безвозвратно удалены.
            </p>
          )}
        </Modal>
        <Modal
          isOpen={!!cardToRename}
          title="Название проекта"
          confirmText="Сохранить"
          cancelText="Отмена"
          isLoading={updateRunMutation.isPending}
          onConfirm={handleRename}
          onCancel={() => setCardToRename(null)}
        >
          <Input
            autoFocus
            label="Название"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleRename();
            }}
          />
        </Modal>
      </div>
    </section>
  );
}

function getDraftTitle(draft: BriefDraft) {
  if (draft.title?.trim()) return draft.title.trim();

  const source = draft.finalBrief ?? draft.rawBrief;
  const firstLine = source
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ?? "Новый проект";
}

function getDraftCardId(draftId: string) {
  return `draft:${draftId}`;
}

function sortRuns(runs: Run[]) {
  return [...runs].sort((left, right) => {
    const leftPinned = left.isPinned;
    const rightPinned = right.isPinned;
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

function sortDrafts(drafts: BriefDraft[], pinnedIds: Set<string>) {
  return [...drafts].sort((left, right) => {
    const leftPinned = pinnedIds.has(getDraftCardId(left.id));
    const rightPinned = pinnedIds.has(getDraftCardId(right.id));
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

function readPinnedDraftIds() {
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

function savePinnedDraftIds(ids: string[]) {
  localStorage.setItem(PINNED_DRAFTS_STORAGE_KEY, JSON.stringify(ids));
}

function getBriefPreview(brief: string) {
  const normalized = brief.replace(/\s+/g, " ").trim();
  if (!normalized) return "Описание пока не заполнено.";
  if (normalized.length <= 180) return normalized;

  return `${normalized.slice(0, 180).trim()}...`;
}

function getDraftDescription(draft: BriefDraft) {
  const title = getDraftTitle(draft);
  const preview = getBriefPreview(draft.finalBrief ?? draft.rawBrief);

  if (isSameText(title, preview)) return "";
  return preview;
}

function getRunDescription(run: Run) {
  const title = getRunTitle(run);
  const preview = getBriefPreview(run.brief);

  if (isSameText(title, preview)) return getRunMeta(run);
  return preview;
}

function isSameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function getDraftProgress(draft: BriefDraft) {
  if (draft.finalBrief) return "Финальный бриф готов";
  if (draft.answers.length > 0) {
    return `${draft.answers.length} ${getQuestionWord(draft.answers.length)} отвечено`;
  }

  return draft.rawBrief.trim() ? "Исходный бриф заполнен" : "Пустой черновик";
}

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

function getRunMeta(run: Run) {
  if (run.currentStep) return getStepLabel(run.currentStep);
  if (run.artifacts.length > 0) {
    return `${run.artifacts.length} ${getArtifactWord(run.artifacts.length)}`;
  }
  if (run.score !== null) return `Оценка ${Math.round(run.score)}%`;

  return run.slug;
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
  return formatStep(step);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
