import type { FC } from "react";

import { Skeleton } from "@/kit";
import type { Run } from "@/api/services/runs";

import { formatArtifactType } from "../utils";

interface OverviewTabProps {
  run: Run;
  styles: Record<string, string>;
}

export const OverviewTab: FC<OverviewTabProps> = ({ run, styles }) => {
  return (
    <div className={styles.overviewGrid}>
      <div className={styles.panel}>
        <h2>Бриф</h2>
        <pre>{run.brief}</pre>
      </div>

      <div className={styles.panel}>
        <h2>Артефакты</h2>
        {run.artifacts.length === 0 ? (
          <Skeleton lines={3} />
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
