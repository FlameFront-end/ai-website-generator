import type { FC } from "react";

import { Skeleton } from "@/kit";
import type { Run } from "@/api/services/runs";

import { ArtifactViewer } from "../components/ArtifactViewer";

interface ArtifactsTabProps {
  run: Run;
  styles: Record<string, string>;
}

export const ArtifactsTab: FC<ArtifactsTabProps> = ({ run, styles }) => {
  return (
    <div className={styles.artifactsGrid}>
      {run.artifacts.length === 0 && <Skeleton lines={6} />}
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
