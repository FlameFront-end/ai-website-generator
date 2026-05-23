import type { FC, ReactNode } from "react";

import clsx from "clsx";

import styles from "./EmptyState.module.scss";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  loading = false,
  children,
  className,
}) => {
  return (
    <div className={clsx(styles.emptyState, className)}>
      {loading && <span className={styles.spinner} />}
      {!loading && icon && <span className={styles.icon}>{icon}</span>}
      {title && <h1>{title}</h1>}
      {description && <p>{description}</p>}
      {children}
    </div>
  );
};
