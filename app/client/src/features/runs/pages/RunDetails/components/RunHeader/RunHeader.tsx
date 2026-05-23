import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/kit";
import type { Run } from "@/api/services/runs";

import { RunStatusBadge } from "../../../../components/RunStatusBadge/RunStatusBadge";
import { getRunTitle } from "../../../../lib";

import styles from "./RunHeader.module.scss";

interface RunHeaderProps {
  run: Run;
  canDownloadCode: boolean;
  isRenaming: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  isRestartingStep: boolean;
  isStoppingStep: boolean;
  isRestartingCodeStep: boolean;
  canRestartStep: boolean;
  canStopStep: boolean;
  canRestartCodeStep: boolean;
  onRename: (displayName: string | null) => void;
  onDelete: () => void;
  onDownload: () => void;
  onRestartStep: () => void;
  onStopStep: () => void;
  onRestartCodeStep: () => void;
}

export const RunHeader: FC<RunHeaderProps> = ({
  run,
  canDownloadCode,
  isRenaming,
  isDeleting,
  isDownloading,
  isRestartingStep,
  isStoppingStep,
  isRestartingCodeStep,
  canRestartStep,
  canStopStep,
  canRestartCodeStep,
  onRename,
  onDelete,
  onDownload,
  onRestartStep,
  onStopStep,
  onRestartCodeStep,
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
        <div className={styles.headerTitle}>
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
            <div className={styles.titleRow}>
              <h1>{getRunTitle(run)}</h1>
            </div>
          )}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.headerActions}>
            <Button variant="secondary" onClick={startRename}>
              Переименовать
            </Button>
            {canDownloadCode && (
              <Button
                variant="secondary"
                isLoading={isDownloading}
                onClick={onDownload}
                title="Скачать проект ZIP-архивом"
              >
                Скачать код
              </Button>
            )}
            <Button
              variant="secondary"
              isLoading={isRestartingStep}
              onClick={onRestartStep}
              disabled={!canRestartStep}
              title={
                canRestartStep
                  ? "Перезапустить текущий шаг"
                  : "Перезапуск доступен только на шаге ожидания подтверждения"
              }
            >
              Перезапустить шаг
            </Button>

            {canStopStep && (
              <Button
                variant="secondary"
                isLoading={isStoppingStep}
                onClick={onStopStep}
                title="Остановить текущий зависший шаг"
              >
                Остановить шаг
              </Button>
            )}
            {canRestartCodeStep && (
              <Button
                variant="secondary"
                isLoading={isRestartingCodeStep}
                onClick={onRestartCodeStep}
                title="Перегенерировать код проекта"
              >
                Перегенерировать код
              </Button>
            )}
            <div className={styles.headerDivider} />
            <Button variant="danger" isLoading={isDeleting} onClick={onDelete}>
              Удалить
            </Button>
          </div>
          <div className={styles.headerMeta}>
            <RunStatusBadge status={run.status} />
            {run.score !== null && run.score !== undefined && (
              <span className={styles.scoreBadge}>Score: {run.score}/100</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
