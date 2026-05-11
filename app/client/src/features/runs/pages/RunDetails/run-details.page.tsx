import { Link, useParams } from 'react-router-dom'

import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import { useRunQuery } from '@/shared/api/services/runs'

import styles from './run-details.module.scss'

export default function RunDetailsPage() {
  const { runId = '' } = useParams()
  const runQuery = useRunQuery(runId)

  if (runQuery.isLoading) {
    return <p>Loading run...</p>
  }

  if (runQuery.isError || !runQuery.data) {
    return (
      <section className={styles.page}>
        <Link to="/">Back to runs</Link>
        <h1>Run is not available yet</h1>
        <p>The backend endpoint will be implemented in the next step.</p>
      </section>
    )
  }

  const run = runQuery.data

  return (
    <section className={styles.page}>
      <Link to="/">Back to runs</Link>
      <div className={styles.header}>
        <div>
          <h1>{run.slug}</h1>
          <p>{run.currentStep || 'Waiting for pipeline status'}</p>
        </div>
        <RunStatusBadge status={run.status} />
      </div>

      <div className={styles.panel}>
        <h2>Brief</h2>
        <pre>{run.brief}</pre>
      </div>
    </section>
  )
}
