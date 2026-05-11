import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { BriefForm } from '@/features/runs/components/BriefForm'
import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import { useCreateRunMutation, useRunsQuery } from '@/shared/api/services/runs'

import styles from './runs-list.module.scss'

function formatRunTitle(slug: string) {
  return slug.replace(/^run-(\d+)$/, 'Запуск $1')
}

export default function RunsListPage() {
  const navigate = useNavigate()
  const runsQuery = useRunsQuery()
  const createRunMutation = useCreateRunMutation()

  const handleCreateRun = (brief: string) => {
    createRunMutation.mutate(
      { brief },
      {
        onSuccess: run => navigate(`/runs/${run.id}`),
        onError: () => toast.error('Не удалось создать запуск'),
      },
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.intro}>
        <h1>Генерация первого экрана по брифу</h1>
        <p>Создайте запуск, отслеживайте этапы пайплайна и проверяйте созданные артефакты.</p>
      </div>

      <div className={styles.grid}>
        <BriefForm isSubmitting={createRunMutation.isPending} onSubmit={handleCreateRun} />

        <aside className={styles.runs}>
          <h2>Последние запуски</h2>
          {runsQuery.isLoading && <p>Загружаем запуски...</p>}
          {runsQuery.isError && <p>API запусков пока недоступен.</p>}
          {runsQuery.data?.length === 0 && <p>Запусков пока нет.</p>}
          {runsQuery.data?.map(run => (
            <button key={run.id} type="button" onClick={() => navigate(`/runs/${run.id}`)}>
              <span>{formatRunTitle(run.slug)}</span>
              <RunStatusBadge status={run.status} />
            </button>
          ))}
        </aside>
      </div>
    </section>
  )
}
