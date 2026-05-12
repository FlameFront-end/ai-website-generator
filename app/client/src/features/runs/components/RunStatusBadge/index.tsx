import type { RunStatus } from "@/api/services/runs";

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
  awaiting_spec_approval: "Ожидание подтверждения",
  awaiting_design_approval: "Ожидание подтверждения",
  awaiting_reference_approval: "Ожидание подтверждения",
  awaiting_code_approval: "Ожидание подтверждения",
  awaiting_final_approval: "Ожидание подтверждения",
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return <span className={styles.badge}>{STATUS_LABELS[status]}</span>;
}
