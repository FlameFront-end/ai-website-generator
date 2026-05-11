import type { RunStatus } from "@/shared/api/services/runs";

import styles from "./RunStatusBadge.module.scss";

interface RunStatusBadgeProps {
  status: RunStatus;
}

const STATUS_LABELS: Record<RunStatus, string> = {
  queued: "В очереди",
  running: "В работе",
  reference_failed: "Ошибка",
  build_failed: "Ошибка",
  visual_failed: "Ошибка",
  needs_manual_review: "Проверка",
  completed: "Готово",
  failed: "Ошибка",
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return <span className={styles.badge}>{STATUS_LABELS[status]}</span>;
}
