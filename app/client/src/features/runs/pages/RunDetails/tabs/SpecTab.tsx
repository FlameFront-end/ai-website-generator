import type { FC } from "react";

import { Skeleton } from "@/kit";
import { useArtifactContentQuery } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

import { renderProjectSpec } from "../renderers";

interface SpecTabProps {
  runId: string;
  artifact: RunArtifact | undefined;
  styles: Record<string, string>;
}

export const SpecTab: FC<SpecTabProps> = ({ runId, artifact, styles }) => {
  const contentQuery = useArtifactContentQuery(runId, artifact?.id);

  return (
    <div className={styles.panel}>
      <h2>Спецификация проекта</h2>
      {!artifact && <Skeleton lines={8} />}
      {contentQuery.isLoading && <p>Загружаем спецификацию проекта...</p>}
      {contentQuery.isError && (
        <p>Не удалось загрузить спецификацию проекта.</p>
      )}
      {contentQuery.data &&
        renderProjectSpec(contentQuery.data.content, styles.spec)}
    </div>
  );
};
