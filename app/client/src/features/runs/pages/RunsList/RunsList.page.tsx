import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import { Input, Modal } from "@/kit";
import { ROUTES } from "@/model";

import { getRunTitle } from "../../lib/run-title";

import { DraftCard, RunCard, ProjectCardSkeleton } from "./components";
import { useRunCards } from "./hooks/useRunCards";
import styles from "./RunsList.module.scss";

export default function RunsListPage() {
  const navigate = useNavigate();
  const cards = useRunCards();

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.toolbarSearch}>
          <Search size={15} />
          <input
            type="search"
            value={cards.searchQuery}
            onChange={(event) => cards.setSearchQuery(event.target.value)}
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
          {cards.runsQuery.isLoading && (
            <div className={styles.runsList} aria-label="Загружаем проекты">
              {Array.from({ length: 4 }).map((_, index) => (
                <ProjectCardSkeleton key={index} />
              ))}
            </div>
          )}
          {cards.runsQuery.isError && (
            <div className={styles.emptyState}>
              API проектов пока недоступен.
            </div>
          )}
          {cards.runsQuery.data?.length === 0 && cards.drafts.length === 0 && (
            <div className={styles.emptyState}>
              Проектов пока нет. Создайте первый проект.
            </div>
          )}
          {(Boolean(cards.runsQuery.data?.length) || cards.drafts.length > 0) &&
            !cards.hasItems && (
              <div className={styles.emptyState}>
                По запросу «{cards.searchQuery}» ничего не найдено.
              </div>
            )}
          <div className={styles.runsList}>
            {cards.filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                isPinned={cards.isDraftPinned(draft.id)}
                onOpen={() => navigate(`${ROUTES.NEW_RUN}?draft=${draft.id}`)}
                onTogglePin={() => cards.toggleDraftPinned(draft.id)}
                onRename={() => cards.openRename({ type: "draft", draft })}
                onDelete={() => cards.handleDeleteDraft(draft.id)}
              />
            ))}
            {cards.filteredRuns.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                onOpen={() => navigate(ROUTES.runDetails(run.id))}
                onTogglePin={() => cards.toggleRunPinned(run)}
                onRename={() => cards.openRename({ type: "run", run })}
                onDelete={() => cards.setRunToDelete(run)}
              />
            ))}
          </div>
        </aside>

        <Modal
          isOpen={!!cards.runToDelete}
          title="Удалить проект?"
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          isLoading={cards.isDeletingRun}
          onConfirm={cards.confirmDeleteRun}
          onCancel={() => cards.setRunToDelete(null)}
        >
          {cards.runToDelete && (
            <p>
              Проект <strong>«{getRunTitle(cards.runToDelete)}»</strong> и все
              его файлы в папке generated будут безвозвратно удалены.
            </p>
          )}
        </Modal>
        <Modal
          isOpen={!!cards.cardToRename}
          title="Название проекта"
          confirmText="Сохранить"
          cancelText="Отмена"
          isLoading={cards.isRenaming}
          onConfirm={cards.handleRename}
          onCancel={() => cards.setCardToRename(null)}
        >
          <Input
            autoFocus
            label="Название"
            value={cards.renameValue}
            onChange={(event) => cards.setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") cards.handleRename();
            }}
          />
        </Modal>
      </div>
    </section>
  );
}
