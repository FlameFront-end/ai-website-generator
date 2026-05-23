import type { FC } from "react";

import clsx from "clsx";

import styles from "./Skeleton.module.scss";

interface SkeletonProps {
  lines?: number;
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ lines = 4, className }) => {
  return (
    <div className={clsx(styles.block, className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className={styles.line} />
      ))}
    </div>
  );
};
