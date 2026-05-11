import { Link, useParams } from 'react-router-dom'

import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import { useArtifactContentQuery, useRunQuery } from '@/shared/api/services/runs'

import styles from './run-details.module.scss'

export default function RunDetailsPage() {
  const { runId = '' } = useParams()
  const runQuery = useRunQuery(runId)
  const run = runQuery.data
  const projectSpecArtifact = run?.artifacts.find(artifact => artifact.type === 'project_spec')
  const projectSpecQuery = useArtifactContentQuery(run?.id ?? '', projectSpecArtifact?.id)

  if (runQuery.isLoading) {
    return <p>Loading run...</p>
  }

  if (runQuery.isError || !run) {
    return (
      <section className={styles.page}>
        <Link to="/">Back to runs</Link>
        <h1>Run is not available yet</h1>
        <p>The backend endpoint will be implemented in the next step.</p>
      </section>
    )
  }

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

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2>Brief</h2>
          <pre>{run.brief}</pre>
        </div>

        <div className={styles.panel}>
          <h2>Artifacts</h2>
          {run.artifacts.length === 0 && <p>No artifacts yet.</p>}
          <ul className={styles.list}>
            {run.artifacts.map(artifact => (
              <li key={artifact.id}>
                <strong>{artifact.type}</strong>
                <span>{artifact.path}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <h2>Logs</h2>
          {run.logs.length === 0 && <p>No logs yet.</p>}
          <ul className={styles.list}>
            {run.logs.map(log => (
              <li key={log.id}>
                <strong>{log.message}</strong>
                <span>
                  {log.level} · {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <h2>Project spec</h2>
          {!projectSpecArtifact && <p>project-spec.json is not ready yet.</p>}
          {projectSpecQuery.isLoading && <p>Loading project spec...</p>}
          {projectSpecQuery.isError && <p>Failed to load project spec.</p>}
          {projectSpecQuery.data && <pre>{projectSpecQuery.data.content}</pre>}
        </div>
      </div>
    </section>
  )
}
