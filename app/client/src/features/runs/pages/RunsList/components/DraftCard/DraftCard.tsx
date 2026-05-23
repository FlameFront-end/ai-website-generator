import type { FC } from "react";

import clsx from "clsx";
import {
  CalendarClock,
  FileText,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

import type { BriefDraft } from "../../../../lib/brief-drafts";
import {
  formatDate,
  getDraftDescription,
  getDraftProgress,
  getDraftTitle,
} from "../../../../lib/runs-list-helpers";

import styles from "../project-card.module.scss";

interface DraftCardProps {
  draft: BriefDraft;
  isPinned: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export const DraftCard: FC<DraftCardProps> = ({
  draft,
  isPinned,
  onOpen,
  onTogglePin,
  onRename,
  onDelete,
}) => {
  const description = getDraftDescription(draft);

  return (
    <div className={styles.runItem}>
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          styles.runButton,
          styles.draftButton,
          isPinned && styles.pinnedCard,
        )}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{getDraftTitle(draft)}</span>
          <div className={styles.cardHeaderRight}>
            <span className={styles.draftBadge}>Черновик</span>
            <span className={styles.cardActions}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin();
                }}
                title={isPinned ? "Открепить" : "Закрепить"}
                aria-label={
                  isPinned ? "Открепить черновик" : "Закрепить черновик"
                }
              >
                {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRename();
                }}
                title="Переименовать"
                aria-label="Переименовать черновик"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                title="Удалить черновик"
                aria-label="Удалить черновик"
              >
                <Trash2 size={15} />
              </button>
            </span>
          </div>
        </div>
        {description && <p className={styles.cardDescription}>{description}</p>}
        <div className={styles.cardMeta}>
          <span>
            <FileText size={13} />
            {getDraftProgress(draft)}
          </span>
          <span>
            <CalendarClock size={13} />
            Обновлен {formatDate(draft.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
