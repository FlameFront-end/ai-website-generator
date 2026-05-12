import type { FC } from "react";

import { CheckCircle2 } from "lucide-react";

import { formatStep, getProgress } from "../utils";

interface ProgressBarProps {
  step: string | null;
  status: string;
  styles: Record<string, string>;
}

export const ProgressBar: FC<ProgressBarProps> = ({ step, status, styles }) => {
  const progress = getProgress(step, status);
  const isCompleted = status === "completed";

  return (
    <div
      className={`${styles.progressPanel} ${isCompleted ? styles.completedPanel : ""}`}
    >
      <div className={styles.progressHeader}>
        <div className={styles.progressInfo}>
          {isCompleted ? (
            <>
              <CheckCircle2 className={styles.completedIcon} />
              <strong className={styles.completedText}>
                Проект завершен успешно
              </strong>
            </>
          ) : (
            <strong>{formatStep(step)}</strong>
          )}
          {!isCompleted && <span>{progress}%</span>}
        </div>
        {isCompleted && (
          <span className={styles.completedScore}>{progress}%</span>
        )}
      </div>
      <div
        className={`${styles.progressTrack} ${isCompleted ? styles.completedTrack : ""}`}
      >
        <span
          style={{ width: `${progress}%` }}
          className={isCompleted ? styles.completedBar : ""}
        />
      </div>
    </div>
  );
};
