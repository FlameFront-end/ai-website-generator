import type { RunStatus } from '@/shared/api/services/runs'

import styles from './RunStatusBadge.module.scss'

interface RunStatusBadgeProps {
  status: RunStatus
}

const STATUS_LABELS: Record<RunStatus, string> = {
  queued: 'В очереди',
  running: 'Выполняется',
  reference_failed: 'Ошибка референса',
  build_failed: 'Ошибка сборки',
  visual_failed: 'Ошибка визуальной проверки',
  needs_manual_review: 'Нужна ручная проверка',
  completed: 'Завершен',
  failed: 'Ошибка',
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return <span className={styles.badge}>{STATUS_LABELS[status]}</span>
}
