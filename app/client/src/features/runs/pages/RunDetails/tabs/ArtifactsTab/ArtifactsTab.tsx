import type { FC } from "react";

import clsx from "clsx";

import type { Run } from "@/api/services/runs";

import { ArtifactViewer } from "../../components/ArtifactViewer/ArtifactViewer";

import styles from "./ArtifactsTab.module.scss";

interface ArtifactsTabProps {
  run: Run;
}

const SKELETON_ROWS = Array.from({ length: 8 });

const ArtifactsSkeleton: FC = () => (
  <>
    {SKELETON_ROWS.map((_, index) => (
      <div key={index} className={styles.artifactItem}>
        <div
          className={clsx(styles.artifactHeader, styles.artifactSkeletonRow)}
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

export const ArtifactsTab: FC<ArtifactsTabProps> = ({ run }) => {
  return (
    <div className={styles.artifactsList}>
      {run.artifacts.length === 0 && <ArtifactsSkeleton />}
      {run.artifacts.map((artifact) => (
        <ArtifactViewer key={artifact.id} runId={run.id} artifact={artifact} />
      ))}
    </div>
  );
};
