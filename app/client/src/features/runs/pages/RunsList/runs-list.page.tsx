import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { BriefForm } from "@/features/runs/components/BriefForm";
import { RunStatusBadge } from "@/features/runs/components/RunStatusBadge";
import {
  useCreateRunMutation,
  useDeleteRunMutation,
  useRunsQuery,
} from "@/shared/api/services/runs";
import type { Run } from "@/shared/api/services/runs";
import { Modal } from "@/shared/widgets/Modal/modal";

import styles from "./runs-list.module.scss";

function formatRunTitle(slug: string) {
  return slug.replace(/^run-(\d+)$/, "Запуск $1");
}

function getRunTitle(run: Run) {
  return run.displayName || formatRunTitle(run.slug);
}

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
        <h1>Генерация первого экрана по брифу</h1>
        <p>
          Создайте запуск, отслеживайте этапы пайплайна и проверяйте созданные
          артефакты.
        </p>
      </div>

      <div className={styles.grid}>
        <BriefForm
          isSubmitting={createRunMutation.isPending}
          onSubmit={handleCreateRun}
        />

        <aside className={styles.runs}>
          <h2>Последние запуски</h2>
          {runsQuery.isLoading && <p>Загружаем запуски...</p>}
          {runsQuery.isError && <p>API запусков пока недоступен.</p>}
          {runsQuery.data?.length === 0 && <p>Запусков пока нет.</p>}
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
                <button
                  type="button"
                  className={styles.deleteButton}
                  disabled={deleteRunMutation.isPending}
                  onClick={() => setRunToDelete(run)}
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
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
