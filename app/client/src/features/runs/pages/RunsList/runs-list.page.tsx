import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { BriefForm } from "@/features/runs/components/BriefForm";
import { RunStatusBadge } from "@/features/runs/components/RunStatusBadge";
import {
  useCreateRunMutation,
  useDeleteRunMutation,
  useRunsQuery,
} from "@/api/services/runs";
import type { Run } from "@/api/services/runs";
import { IconButton, Modal, Spinner } from "@/kit";

import { getRunTitle } from "../../lib/run-title";

import styles from "./runs-list.module.scss";

export default function RunsListPage() {
  const navigate = useNavigate();
  const runsQuery = useRunsQuery();
  const createRunMutation = useCreateRunMutation();
  const deleteRunMutation = useDeleteRunMutation();
  const [runToDelete, setRunToDelete] = useState<Run | null>(null);

  const handleCreateRun = (brief: string) => {
    createRunMutation.mutate(
      { brief },
      {
        onSuccess: (run) => navigate(`/runs/${run.id}`),
        onError: () => toast.error("Не удалось создать запуск"),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!runToDelete) return;

    deleteRunMutation.mutate(runToDelete.id, {
      onSuccess: () => {
        setRunToDelete(null);
        toast.success("Запуск удален");
      },
      onError: () => toast.error("Не удалось удалить запуск"),
    });
  };

  return (
    <section className={styles.page}>
      <div className={styles.intro}>
        <h1>Создайте первый экран за минуту</h1>
        <p>Опишите проект, выберите стиль, получите готовый код.</p>
      </div>

      <div className={styles.grid}>
        <BriefForm
          isSubmitting={createRunMutation.isPending}
          onSubmit={handleCreateRun}
        />

        <aside className={styles.runs}>
          <h2>
            <FileText size={18} />
            Последние запуски
          </h2>
          {runsQuery.isLoading && (
            <div className={styles.emptyState}>
              <Spinner size={18} />
              Загружаем запуски...
            </div>
          )}
          {runsQuery.isError && (
            <div className={styles.emptyState}>
              API запусков пока недоступен.
            </div>
          )}
          {runsQuery.data?.length === 0 && (
            <div className={styles.emptyState}>
              Запусков пока нет. Создайте первый запуск, заполнив бриф слева.
            </div>
          )}
          <div className={styles.runsList}>
            {runsQuery.data?.map((run) => (
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
                  aria-label="Удалить запуск"
                />
              </div>
            ))}
          </div>
        </aside>

        <Modal
          isOpen={!!runToDelete}
          title="Удалить запуск?"
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          isLoading={deleteRunMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRunToDelete(null)}
        >
          {runToDelete && (
            <p>
              Запуск <strong>«{getRunTitle(runToDelete)}»</strong> и все его
              файлы в папке generated будут безвозвратно удалены.
            </p>
          )}
        </Modal>
      </div>
    </section>
  );
}
