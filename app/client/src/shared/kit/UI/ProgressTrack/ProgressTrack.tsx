import type { FC } from "react";

import clsx from "clsx";

import styles from "./ProgressTrack.module.scss";

interface ProgressTrackProps {
  value: number;
  className?: string;
}

export const ProgressTrack: FC<ProgressTrackProps> = ({
  value,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={clsx(styles.track, className)}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
};
