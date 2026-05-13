import type { FC, ReactNode } from "react";

import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

import styles from "./Layout.module.scss";

export interface AppHeaderBackLink {
  to: string;
  label: string;
  ariaLabel?: string;
}

interface AppHeaderProps {
  title: string;
  backLink?: AppHeaderBackLink;
  actions?: ReactNode;
}

export const AppHeader: FC<AppHeaderProps> = ({ title, backLink, actions }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerTitleGroup}>
          {backLink && (
            <Link
              className={styles.headerBackLink}
              to={backLink.to}
              aria-label={backLink.ariaLabel}
            >
              <ChevronLeft size={15} aria-hidden="true" />
              <span>{backLink.label}</span>
            </Link>
          )}
          <strong>{title}</strong>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
};
