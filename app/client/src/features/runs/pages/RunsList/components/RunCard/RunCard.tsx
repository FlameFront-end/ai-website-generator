import type { FC } from "react";

import clsx from "clsx";
import {
  CalendarClock,
  Layers3,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

import { RunStatusBadge } from "@/features/runs/components/RunStatusBadge/RunStatusBadge";
import type { Run } from "@/api/services/runs";

import { getRunTitle } from "../../../../lib/run-title";
import {
  formatDate,
  getRunDescription,
  getRunMeta,
} from "../../../../lib/runs-list-helpers";

import styles from "../project-card.module.scss";

interface RunCardProps {
  run: Run;
  onOpen: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export const RunCard: FC<RunCardProps> = ({
  run,
  onOpen,
  onTogglePin,
  onRename,
  onDelete,
}) => (
  <div className={styles.runItem}>
    <div
      role="button"
      tabIndex={0}
      className={clsx(styles.runButton, run.isPinned && styles.pinnedCard)}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{getRunTitle(run)}</span>
        <div className={styles.cardHeaderRight}>
          <RunStatusBadge status={run.status} />
          <span className={styles.cardActions}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin();
              }}
              title={run.isPinned ? "Открепить" : "Закрепить"}
              aria-label={
                run.isPinned ? "Открепить проект" : "Закрепить проект"
              }
            >
              {run.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRename();
              }}
              title="Переименовать"
              aria-label="Переименовать проект"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              title="Удалить"
              aria-label="Удалить проект"
            >
              <Trash2 size={15} />
            </button>
          </span>
        </div>
      </div>
      <p className={styles.cardDescription}>{getRunDescription(run)}</p>
      <div className={styles.cardMeta}>
        <span>
          <Layers3 size={13} />
          {getRunMeta(run)}
        </span>
        <span>
          <CalendarClock size={13} />
          Создан {formatDate(run.createdAt)}
        </span>
      </div>
    </div>
  </div>
);
