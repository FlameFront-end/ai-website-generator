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
import { CardAction } from "@/kit";

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
  <article className={styles.runItem}>
    <button
      type="button"
      className={clsx(styles.runButton, run.isPinned && styles.pinnedCard)}
      onClick={onOpen}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{getRunTitle(run)}</span>
        <div className={styles.cardHeaderRight}>
          <RunStatusBadge status={run.status} />
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
    </button>
    <div className={styles.cardActions} role="toolbar" aria-label="Действия">
      <CardAction
        icon={run.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
        title={run.isPinned ? "Открепить" : "Закрепить"}
        ariaLabel={run.isPinned ? "Открепить проект" : "Закрепить проект"}
        onClick={onTogglePin}
      />
      <CardAction
        icon={<Pencil size={15} />}
        title="Переименовать"
        ariaLabel="Переименовать проект"
        onClick={onRename}
      />
      <CardAction
        icon={<Trash2 size={15} />}
        title="Удалить"
        ariaLabel="Удалить проект"
        onClick={onDelete}
      />
    </div>
  </article>
);
