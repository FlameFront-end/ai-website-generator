import type { FC, ReactNode } from "react";

import clsx from "clsx";

import styles from "./Badge.module.scss";

export type BadgeVariant = "default" | "info" | "subtle";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  children,
  variant = "default",
  className,
}) => {
  return (
    <span className={clsx(styles.badge, styles[variant], className)}>
      {children}
    </span>
  );
};
