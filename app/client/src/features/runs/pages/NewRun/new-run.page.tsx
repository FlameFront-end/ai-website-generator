import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useCreateRunMutation } from "@/api/services/runs";
import { BriefForm } from "@/features/runs/components/BriefForm";
import { ROUTES } from "@/model";

import styles from "./new-run.module.scss";

export default function NewRunPage() {
  const navigate = useNavigate();
  const createRunMutation = useCreateRunMutation();

  const handleCreateRun = (brief: string) => {
    createRunMutation.mutate(
      { brief },
      {
        onSuccess: (run) => navigate(`/runs/${run.id}`),
        onError: () => toast.error("Не удалось создать запуск"),
      },
    );
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <button type="button" onClick={() => navigate(ROUTES.RUNS)}>
          Назад к проектам
        </button>
      </div>
      <BriefForm
        isSubmitting={createRunMutation.isPending}
        onSubmit={handleCreateRun}
      />
    </section>
  );
}
