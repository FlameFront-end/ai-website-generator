import { Link, useParams } from 'react-router-dom'

import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import { useArtifactContentQuery, useRunQuery } from '@/shared/api/services/runs'
import type { RunArtifact, RunLog } from '@/shared/api/services/runs'

import styles from './run-details.module.scss'

const STEP_LABELS: Record<string, string> = {
  queued: 'В очереди',
  prepare_brief: 'Подготовка брифа',
  project_spec_ready: 'Спецификация проекта готова',
}

const ARTIFACT_LABELS: Record<string, string> = {
  project_spec: 'Спецификация проекта',
  reference_image: 'Визуальный референс',
  design_description: 'Описание дизайна',
  design_tokens: 'Дизайн-токены',
  frontend_project: 'Клиентский проект',
  desktop_screenshot: 'Скриншот desktop',
  mobile_screenshot: 'Скриншот mobile',
  visual_report: 'Отчет визуальной проверки',
  diff_image: 'Изображение отличий',
  build_error: 'Ошибка сборки',
  reference_validation: 'Проверка референса',
}

const LOG_LEVEL_LABELS: Record<RunLog['level'], string> = {
  info: 'Информация',
  warning: 'Предупреждение',
  error: 'Ошибка',
}

function formatRunTitle(slug: string) {
  return slug.replace(/^run-(\d+)$/, 'Запуск $1')
}

function formatStep(step: string | null) {
  return step ? STEP_LABELS[step] || step : 'Ожидаем статус пайплайна'
}

function formatArtifactType(artifact: RunArtifact) {
  return ARTIFACT_LABELS[artifact.type] || artifact.type
}

function renderProjectSpec(content: string) {
  try {
    const spec = JSON.parse(content) as {
      siteType?: string
      sectionType?: string
      style?: string[]
      audience?: string
      requiredElements?: string[]
      visualPreferences?: string[]
      copy?: {
        headline?: string
        description?: string
        primaryButton?: string
        secondaryButton?: string
      }
    }

    return (
      <dl className={styles.spec}>
        <div>
          <dt>Тип сайта</dt>
          <dd>{spec.siteType || 'Не определен'}</dd>
        </div>
        <div>
          <dt>Тип блока</dt>
          <dd>{spec.sectionType || 'Не определен'}</dd>
        </div>
        <div>
          <dt>Аудитория</dt>
          <dd>{spec.audience || 'Не определена'}</dd>
        </div>
        <div>
          <dt>Стиль</dt>
          <dd>{spec.style?.join(', ') || 'Не определен'}</dd>
        </div>
        <div>
          <dt>Обязательные элементы</dt>
          <dd>{spec.requiredElements?.join(', ') || 'Не определены'}</dd>
        </div>
        <div>
          <dt>Визуальные пожелания</dt>
          <dd>{spec.visualPreferences?.join(', ') || 'Не определены'}</dd>
        </div>
        <div>
          <dt>Заголовок</dt>
          <dd>{spec.copy?.headline || 'Не задан'}</dd>
        </div>
        <div>
          <dt>Описание</dt>
          <dd>{spec.copy?.description || 'Не задано'}</dd>
        </div>
        <div>
          <dt>Основная кнопка</dt>
          <dd>{spec.copy?.primaryButton || 'Не задана'}</dd>
        </div>
        <div>
          <dt>Вторая кнопка</dt>
          <dd>{spec.copy?.secondaryButton || 'Не задана'}</dd>
        </div>
      </dl>
    )
  } catch {
    return <pre>{content}</pre>
  }
}

export default function RunDetailsPage() {
  const { runId = '' } = useParams()
  const runQuery = useRunQuery(runId)
  const run = runQuery.data
  const projectSpecArtifact = run?.artifacts.find(artifact => artifact.type === 'project_spec')
  const projectSpecQuery = useArtifactContentQuery(run?.id ?? '', projectSpecArtifact?.id)

  if (runQuery.isLoading) {
    return <p>Загружаем запуск...</p>
  }

  if (runQuery.isError || !run) {
    return (
      <section className={styles.page}>
        <Link to="/">Назад к запускам</Link>
        <h1>Запуск недоступен</h1>
        <p>Не удалось загрузить данные запуска.</p>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <Link to="/">Назад к запускам</Link>
      <div className={styles.header}>
        <div>
          <h1>{formatRunTitle(run.slug)}</h1>
          <p>{formatStep(run.currentStep)}</p>
        </div>
        <RunStatusBadge status={run.status} />
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2>Бриф</h2>
          <pre>{run.brief}</pre>
        </div>

        <div className={styles.panel}>
          <h2>Артефакты</h2>
          {run.artifacts.length === 0 && <p>Артефактов пока нет.</p>}
          <ul className={styles.list}>
            {run.artifacts.map(artifact => (
              <li key={artifact.id}>
                <strong>{formatArtifactType(artifact)}</strong>
                <span>{artifact.path}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <h2>Логи</h2>
          {run.logs.length === 0 && <p>Логов пока нет.</p>}
          <ul className={styles.list}>
            {run.logs.map(log => (
              <li key={log.id}>
                <strong>{log.message}</strong>
                <span>
                  {LOG_LEVEL_LABELS[log.level]} · {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <h2>Спецификация проекта</h2>
          {!projectSpecArtifact && <p>project-spec.json пока не готов.</p>}
          {projectSpecQuery.isLoading && <p>Загружаем спецификацию проекта...</p>}
          {projectSpecQuery.isError && <p>Не удалось загрузить спецификацию проекта.</p>}
          {projectSpecQuery.data && renderProjectSpec(projectSpecQuery.data.content)}
        </div>
      </div>
    </section>
  )
}
