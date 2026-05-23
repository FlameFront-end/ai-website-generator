import type { FC } from "react";

import ReactMarkdown from "react-markdown";

import { Skeleton } from "@/kit";
import { useArtifactContentQuery } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

import { renderDesignTokens } from "../../lib/renderers";

import shared from "../../lib/run-details-shared.module.scss";

interface DesignTabProps {
  runId: string;
  designDescription: RunArtifact | undefined;
  designTokens: RunArtifact | undefined;
}

export const DesignTab: FC<DesignTabProps> = ({
  runId,
  designDescription,
  designTokens,
}) => {
  const descriptionQuery = useArtifactContentQuery(
    runId,
    designDescription?.id,
  );
  const tokensQuery = useArtifactContentQuery(runId, designTokens?.id);

  return (
    <div className={shared.overviewGrid}>
      <div className={shared.panel}>
        <h2>Описание дизайна</h2>
        {!designDescription && <Skeleton lines={9} />}
        {descriptionQuery.isLoading && <p>Загружаем описание дизайна...</p>}
        {descriptionQuery.isError && (
          <p>Не удалось загрузить описание дизайна.</p>
        )}
        {descriptionQuery.data && (
          <div className={shared.markdownContent}>
            <ReactMarkdown>{descriptionQuery.data.content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className={shared.panel}>
        <h2>Дизайн-токены</h2>
        {!designTokens && <Skeleton lines={9} />}
        {tokensQuery.isLoading && <p>Загружаем дизайн-токены...</p>}
        {tokensQuery.isError && <p>Не удалось загрузить дизайн-токены.</p>}
        {tokensQuery.data &&
          renderDesignTokens(tokensQuery.data.content, shared.spec)}
      </div>
    </div>
  );
};
