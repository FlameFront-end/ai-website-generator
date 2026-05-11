import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { BriefForm } from '@/features/runs/components/BriefForm'
import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import { useCreateRunMutation, useDeleteRunMutation, useRunsQuery } from '@/shared/api/services/runs'
import type { Run } from '@/shared/api/services/runs'

import styles from './runs-list.module.scss'

function formatRunTitle(slug: string) {
  return slug.replace(/^run-(\d+)$/, 'Запуск $1')
}

function getRunTitle(run: Run) {
  return run.displayName || formatRunTitle(run.slug)
}

export default function RunsListPage() {
  const navigate = useNavigate()
  const runsQuery = useRunsQuery()
  const createRunMutation = useCreateRunMutation()
  const deleteRunMutation = useDeleteRunMutation()

  const handleCreateRun = (brief: string) => {
    createRunMutation.mutate(
      { brief },
      {
        onSuccess: run => navigate(`/runs/${run.id}`),
        onError: () => toast.error('Не удалось создать запуск'),
      },
    )
  }

  const handleDeleteRun = (run: Run) => {
    if (!window.confirm(`Удалить «${getRunTitle(run)}»? Папка запуска в generated тоже будет удалена.`)) {
      return
    }

    deleteRunMutation.mutate(run.id, {
      onError: () => toast.error('Не удалось удалить запуск'),
    })
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
            <div key={run.id} className={styles.runItem}>
              <button type="button" onClick={() => navigate(`/runs/${run.id}`)}>
                <span>{getRunTitle(run)}</span>
                <RunStatusBadge status={run.status} />
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                disabled={deleteRunMutation.isPending}
                onClick={() => handleDeleteRun(run)}
              >
                Удалить
              </button>
            </div>
          ))}
        </aside>
      </div>
    </section>
  )
}
