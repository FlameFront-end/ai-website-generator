import type { FC } from "react";

import { Skeleton } from "@/kit";
import { useArtifactFileUrl } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

interface ReferenceTabProps {
  runId: string;
  artifact: RunArtifact | undefined;
  styles: Record<string, string>;
}

export const ReferenceTab: FC<ReferenceTabProps> = ({
  runId,
  artifact,
  styles,
}) => {
  const fileQuery = useArtifactFileUrl(runId, artifact?.id);

  return (
    <div className={styles.previewPanel}>
      <h2>Визуальный референс</h2>
      {!artifact ? (
        <Skeleton lines={6} />
      ) : fileQuery.isError ? (
        <p className={styles.error}>
          Не удалось загрузить референс. Возможно, файл не найден.
        </p>
      ) : (
        <img
          src={fileQuery.url ?? undefined}
          alt="Визуальный референс первого экрана"
        />
      )}
    </div>
  );
};
