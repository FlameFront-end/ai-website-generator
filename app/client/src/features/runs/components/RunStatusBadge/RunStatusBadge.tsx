import type { RunStatus } from "@/api/services/runs";
import { Badge } from "@/kit";

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
  awaiting_style_selection: "Выбор визуального стиля",
  awaiting_reference_approval: "Ожидание подтверждения",
  awaiting_code_approval: "Ожидание подтверждения",
  awaiting_final_approval: "Ожидание подтверждения",
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return <Badge variant="info">{STATUS_LABELS[status]}</Badge>;
}
