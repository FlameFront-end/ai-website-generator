import type { FC } from "react";

import clsx from "clsx";

import type { Run } from "@/api/services/runs";

import { stripTechnicalBriefPrefix } from "@/features/runs/lib";

import { formatArtifactType } from "../../lib/utils";

import shared from "../../lib/run-details-shared.module.scss";
import local from "./OverviewTab.module.scss";

interface OverviewTabProps {
  run: Run;
}

const SKELETON_ROWS = Array.from({ length: 6 });

const OverviewArtifactsSkeleton: FC = () => (
  <ul className={shared.list}>
    {SKELETON_ROWS.map((_, index) => (
      <li key={index}>
        <span className={local.overviewArtifactSkeletonTitle} />
      </li>
    ))}
  </ul>
);

export const OverviewTab: FC<OverviewTabProps> = ({ run }) => {
  return (
    <div className={shared.overviewGrid}>
      <div className={shared.panel}>
        <h2>Бриф</h2>
        <pre>{stripTechnicalBriefPrefix(run.brief)}</pre>
      </div>

      <div className={clsx(shared.panel, local.overviewArtifactsPanel)}>
        <h2>Артефакты</h2>
        {run.artifacts.length === 0 ? (
          <OverviewArtifactsSkeleton />
        ) : (
          <ul className={shared.list}>
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
