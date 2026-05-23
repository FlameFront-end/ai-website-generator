import type { FC } from "react";

import clsx from "clsx";

import cardStyles from "../project-card.module.scss";
import styles from "./ProjectCardSkeleton.module.scss";

export const ProjectCardSkeleton: FC = () => (
  <div className={cardStyles.runItem} aria-hidden="true">
    <div className={clsx(cardStyles.runButton, styles.skeletonCard)}>
      <div className={cardStyles.cardHeader}>
        <span className={clsx(styles.skeletonLine, styles.skeletonTitle)} />
        <div className={cardStyles.cardHeaderRight}>
          <span className={clsx(styles.skeletonLine, styles.skeletonBadge)} />
          <span className={styles.skeletonActions}>
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
      <div className={styles.skeletonDescription}>
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
      </div>
      <div className={cardStyles.cardMeta}>
        <span>
          <span className={styles.skeletonIcon} />
          <span
            className={clsx(styles.skeletonLine, styles.skeletonMetaLine)}
          />
        </span>
        <span>
          <span className={styles.skeletonIcon} />
          <span
            className={clsx(styles.skeletonLine, styles.skeletonMetaLine)}
          />
        </span>
      </div>
    </div>
  </div>
);
