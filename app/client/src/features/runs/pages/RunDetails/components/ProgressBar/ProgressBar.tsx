import type { FC } from "react";

import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";

import { ProgressTrack } from "@/kit";

import { formatStep, getProgress } from "../../lib/utils";

import styles from "./ProgressBar.module.scss";

interface ProgressBarProps {
  step: string | null;
  status: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({ step, status }) => {
  const progress = getProgress(step, status);
  const isCompleted = status === "completed";

  return (
    <div
      className={clsx(
        styles.progressPanel,
        isCompleted && styles.completedPanel,
      )}
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
      <ProgressTrack value={progress} />
    </div>
  );
};
