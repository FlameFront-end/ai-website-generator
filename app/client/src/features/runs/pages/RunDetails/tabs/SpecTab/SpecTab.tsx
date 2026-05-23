import type { FC } from "react";

import { Panel, Skeleton } from "@/kit";
import { useArtifactContentQuery } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

import { renderProjectSpec } from "../../lib/renderers";

import shared from "../../lib/run-details-shared.module.scss";

interface SpecTabProps {
  runId: string;
  artifact: RunArtifact | undefined;
}

export const SpecTab: FC<SpecTabProps> = ({ runId, artifact }) => {
  const contentQuery = useArtifactContentQuery(runId, artifact?.id);

  return (
    <Panel>
      <h2>Спецификация проекта</h2>
      {!artifact && <Skeleton lines={8} />}
      {contentQuery.isLoading && <p>Загружаем спецификацию проекта...</p>}
      {contentQuery.isError && (
        <p>Не удалось загрузить спецификацию проекта.</p>
      )}
      {contentQuery.data &&
        renderProjectSpec(contentQuery.data.content, shared.spec)}
    </Panel>
  );
};
