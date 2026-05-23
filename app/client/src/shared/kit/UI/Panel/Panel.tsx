import type { FC, ReactNode } from "react";

import clsx from "clsx";

import styles from "./Panel.module.scss";

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export const Panel: FC<PanelProps> = ({ children, className }) => {
  return <div className={clsx(styles.panel, className)}>{children}</div>;
};
