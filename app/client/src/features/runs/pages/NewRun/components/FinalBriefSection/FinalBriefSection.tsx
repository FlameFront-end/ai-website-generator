import type { FC } from "react";

import { Button } from "@/kit";

import styles from "../wizard-shared.module.scss";

interface FinalBriefSectionProps {
  finalBrief: string;
  projectTitle: string;
  isCreating: boolean;
  onFinalBriefChange: (value: string) => void;
  onProjectTitleChange: (value: string) => void;
  onReset: () => void;
  onCreateRun: (brief: string) => void;
}

export const FinalBriefSection: FC<FinalBriefSectionProps> = ({
  finalBrief,
  projectTitle,
  isCreating,
  onFinalBriefChange,
  onProjectTitleChange,
  onReset,
  onCreateRun,
}) => (
  <div className={styles.wizard}>
    <div>
      <p className={styles.eyebrow}>Финальный бриф</p>
      <h1>{projectTitle || "Теперь данных достаточно"}</h1>
      <p>Проверьте улучшенный бриф и запускайте генерацию проекта.</p>
    </div>
    <input
      className={styles.input}
      value={projectTitle}
      onChange={(event) => onProjectTitleChange(event.target.value)}
      placeholder="Короткое название проекта"
    />
    <textarea
      className={styles.finalBrief}
      value={finalBrief}
      onChange={(event) => onFinalBriefChange(event.target.value)}
    />
    <div className={styles.actions}>
      <Button type="button" variant="secondary" onClick={onReset}>
        Вернуться к началу
      </Button>
      <Button
        type="button"
        variant="primary"
        isLoading={isCreating}
        disabled={!finalBrief.trim()}
        onClick={() => onCreateRun(finalBrief)}
      >
        Запустить генерацию
      </Button>
    </div>
  </div>
);
