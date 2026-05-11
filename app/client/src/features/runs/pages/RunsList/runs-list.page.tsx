import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { BriefForm } from '@/features/runs/components/BriefForm'
import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import { useCreateRunMutation, useRunsQuery } from '@/shared/api/services/runs'

import styles from './runs-list.module.scss'

export default function RunsListPage() {
  const navigate = useNavigate()
  const runsQuery = useRunsQuery()
  const createRunMutation = useCreateRunMutation()

  const handleCreateRun = (brief: string) => {
    createRunMutation.mutate(
      { brief },
      {
        onSuccess: run => navigate(`/runs/${run.id}`),
        onError: () => toast.error('Failed to create run'),
      },
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.intro}>
        <h1>Generate hero from brief</h1>
        <p>Create a run, track pipeline status, and review generated artifacts.</p>
      </div>

      <div className={styles.grid}>
        <BriefForm isSubmitting={createRunMutation.isPending} onSubmit={handleCreateRun} />

        <aside className={styles.runs}>
          <h2>Recent runs</h2>
          {runsQuery.isLoading && <p>Loading runs...</p>}
          {runsQuery.isError && <p>Runs API is not ready yet.</p>}
          {runsQuery.data?.length === 0 && <p>No runs yet.</p>}
          {runsQuery.data?.map(run => (
            <button key={run.id} type="button" onClick={() => navigate(`/runs/${run.id}`)}>
              <span>{run.slug}</span>
              <RunStatusBadge status={run.status} />
            </button>
          ))}
        </aside>
      </div>
    </section>
  )
}
