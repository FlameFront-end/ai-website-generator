import { memo } from "react";
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

import { Badge, CardAction } from "@/kit";

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

export const DraftCard: FC<DraftCardProps> = memo(function DraftCard({
  draft,
  isPinned,
  onOpen,
  onTogglePin,
  onRename,
  onDelete,
}) {
  const description = getDraftDescription(draft);

  return (
    <article className={styles.runItem}>
      <button
        type="button"
        className={clsx(
          styles.runButton,
          styles.draftButton,
          isPinned && styles.pinnedCard,
        )}
        onClick={onOpen}
      >
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{getDraftTitle(draft)}</span>
          <div className={styles.cardHeaderRight}>
            <Badge>Черновик</Badge>
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
      </button>
      <div className={styles.cardActions} role="toolbar" aria-label="Действия">
        <CardAction
          icon={isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          title={isPinned ? "Открепить" : "Закрепить"}
          ariaLabel={isPinned ? "Открепить черновик" : "Закрепить черновик"}
          onClick={onTogglePin}
        />
        <CardAction
          icon={<Pencil size={15} />}
          title="Переименовать"
          ariaLabel="Переименовать черновик"
          onClick={onRename}
        />
        <CardAction
          icon={<Trash2 size={15} />}
          title="Удалить черновик"
          ariaLabel="Удалить черновик"
          onClick={onDelete}
        />
      </div>
    </article>
  );
});
