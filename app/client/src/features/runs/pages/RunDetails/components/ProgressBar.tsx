import type { FC } from "react";

import { formatStep, getProgress } from "../utils";

interface ProgressBarProps {
  step: string | null;
  status: string;
  styles: Record<string, string>;
}

export const ProgressBar: FC<ProgressBarProps> = ({ step, status, styles }) => {
  const progress = getProgress(step, status);

  return (
    <div className={styles.progressPanel}>
      <div>
        <strong>{formatStep(step)}</strong>
        <span>{progress}%</span>
      </div>
      <div className={styles.progressTrack}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
