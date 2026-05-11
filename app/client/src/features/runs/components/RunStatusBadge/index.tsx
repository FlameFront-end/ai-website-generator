import type { RunStatus } from '@/shared/api/services/runs'

import styles from './RunStatusBadge.module.scss'

interface RunStatusBadgeProps {
  status: RunStatus
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return <span className={styles.badge}>{status}</span>
}
