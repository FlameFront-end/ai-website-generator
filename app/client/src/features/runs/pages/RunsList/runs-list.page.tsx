import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { RunStatusBadge } from "@/features/runs/components/RunStatusBadge";
import { useDeleteRunMutation, useRunsQuery } from "@/api/services/runs";
import type { Run } from "@/api/services/runs";
import { IconButton, Modal, Spinner } from "@/kit";

import { getRunTitle } from "../../lib/run-title";

import styles from "./runs-list.module.scss";

export default function RunsListPage() {
  const navigate = useNavigate();
  const runsQuery = useRunsQuery();
  const deleteRunMutation = useDeleteRunMutation();
  const [runToDelete, setRunToDelete] = useState<Run | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRuns = runsQuery.data?.filter((run) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [getRunTitle(run), run.status, run.id, run.slug]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

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
        <button type="button" onClick={() => navigate("/new")}>
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
          {runsQuery.data?.length === 0 && (
            <div className={styles.emptyState}>
              Проектов пока нет. Создайте первый проект.
            </div>
          )}
          {!!runsQuery.data?.length && filteredRuns?.length === 0 && (
            <div className={styles.emptyState}>
              По запросу «{searchQuery}» ничего не найдено.
            </div>
          )}
          <div className={styles.runsList}>
            {filteredRuns?.map((run) => (
              <div key={run.id} className={styles.runItem}>
                <button
                  type="button"
                  className={styles.runButton}
                  onClick={() => navigate(`/runs/${run.id}`)}
                >
                  <span>{getRunTitle(run)}</span>
                  <RunStatusBadge status={run.status} />
                </button>
                <IconButton
                  icon={<Trash2 size={16} />}
                  tone="danger"
                  disabled={deleteRunMutation.isPending}
                  onClick={() => setRunToDelete(run)}
                  title="Удалить"
                  aria-label="Удалить проект"
                />
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
      </div>
    </section>
  );
}
