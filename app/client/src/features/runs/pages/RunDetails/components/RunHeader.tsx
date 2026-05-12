import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/kit";
import type { Run } from "@/api/services/runs";

import { RunStatusBadge } from "../../../components/RunStatusBadge";
import { getRunTitle } from "../../../lib";

interface RunHeaderProps {
  run: Run;
  hasFrontendProject: boolean;
  isRenaming: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  isRebuilding: boolean;
  onRename: (displayName: string | null) => void;
  onDelete: () => void;
  onDownload: () => void;
  onRebuild: () => void;
  styles: Record<string, string>;
}

export const RunHeader: FC<RunHeaderProps> = ({
  run,
  hasFrontendProject,
  isRenaming,
  isDeleting,
  isDownloading,
  isRebuilding,
  onRename,
  onDelete,
  onDownload,
  onRebuild,
  styles,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  const startRename = () => {
    setDraftName(run.displayName || getRunTitle(run));
    setIsEditing(true);
  };

  const saveRename = () => {
    onRename(draftName.trim() || null);
    setIsEditing(false);
  };

  return (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        {isEditing ? (
          <div className={styles.renameForm}>
            <input
              value={draftName}
              maxLength={80}
              autoFocus
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveRename();
                if (event.key === "Escape") setIsEditing(false);
              }}
            />
            <Button
              variant="primary"
              isLoading={isRenaming}
              onClick={saveRename}
            >
              Сохранить
            </Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Отмена
            </Button>
          </div>
        ) : (
          <h1>{getRunTitle(run)}</h1>
        )}
        <div className={styles.headerMeta}>
          <RunStatusBadge status={run.status} />
          {run.score !== null && run.score !== undefined && (
            <span className={styles.scoreBadge}>Score: {run.score}/100</span>
          )}
        </div>
      </div>
      <div className={styles.headerActions}>
        <Button variant="secondary" onClick={startRename}>
          Переименовать
        </Button>
        {hasFrontendProject && (
          <Button
            variant="secondary"
            isLoading={isDownloading}
            onClick={onDownload}
          >
            Скачать код
          </Button>
        )}
        <Button
          variant="secondary"
          isLoading={isRebuilding}
          onClick={onRebuild}
          title="Пересобрать проект"
        >
          Пересобрать
        </Button>
        <div className={styles.headerDivider} />
        <Button variant="danger" isLoading={isDeleting} onClick={onDelete}>
          Удалить
        </Button>
      </div>
    </div>
  );
};
