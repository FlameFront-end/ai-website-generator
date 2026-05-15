import type { FC } from "react";

import type { Run } from "@/api/services/runs";

import { formatArtifactType } from "../utils";

interface OverviewTabProps {
  run: Run;
  styles: Record<string, string>;
}

const SKELETON_ROWS = Array.from({ length: 6 });

const OverviewArtifactsSkeleton: FC<{ styles: Record<string, string> }> = ({
  styles,
}) => (
  <ul className={styles.list}>
    {SKELETON_ROWS.map((_, index) => (
      <li key={index} className={styles.overviewArtifactSkeletonItem}>
        <span className={styles.overviewArtifactSkeletonTitle} />
      </li>
    ))}
  </ul>
);

export const OverviewTab: FC<OverviewTabProps> = ({ run, styles }) => {
  return (
    <div className={styles.overviewGrid}>
      <div className={styles.panel}>
        <h2>Бриф</h2>
        <pre>{run.brief}</pre>
      </div>

      <div className={`${styles.panel} ${styles.overviewArtifactsPanel}`}>
        <h2>Артефакты</h2>
        {run.artifacts.length === 0 ? (
          <OverviewArtifactsSkeleton styles={styles} />
        ) : (
          <ul className={styles.list}>
            {run.artifacts.map((artifact) => (
              <li key={artifact.id}>
                <strong>{formatArtifactType(artifact)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
