import type { FC } from "react";

import type { Run } from "@/api/services/runs";

import { ArtifactViewer } from "../components/ArtifactViewer";

interface ArtifactsTabProps {
  run: Run;
  styles: Record<string, string>;
}

const SKELETON_ROWS = Array.from({ length: 8 });

const ArtifactsSkeleton: FC<{ styles: Record<string, string> }> = ({
  styles,
}) => (
  <>
    {SKELETON_ROWS.map((_, index) => (
      <div key={index} className={styles.artifactItem}>
        <div
          className={`${styles.artifactHeader} ${styles.artifactSkeletonRow}`}
        >
          <span className={styles.artifactSkeletonChevron} />
          <span className={styles.artifactSkeletonBadge} />
          <span className={styles.artifactSkeletonLabel} />
          <span className={styles.artifactSkeletonPath} />
        </div>
      </div>
    ))}
  </>
);

export const ArtifactsTab: FC<ArtifactsTabProps> = ({ run, styles }) => {
  return (
    <div className={styles.artifactsList}>
      {run.artifacts.length === 0 && <ArtifactsSkeleton styles={styles} />}
      {run.artifacts.map((artifact) => (
        <ArtifactViewer
          key={artifact.id}
          runId={run.id}
          artifact={artifact}
          styles={styles}
        />
      ))}
    </div>
  );
};
