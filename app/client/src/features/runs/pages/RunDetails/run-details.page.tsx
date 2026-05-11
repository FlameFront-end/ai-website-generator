import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge'
import {
  runsApi,
  useArtifactContentQuery,
  useDeleteRunMutation,
  useRunQuery,
  useUpdateRunMutation,
} from '@/shared/api/services/runs'
import type { RunArtifact, RunLog } from '@/shared/api/services/runs'

import styles from './run-details.module.scss'

const STEP_LABELS: Record<string, string> = {
  queued: 'В очереди',
  prepare_brief: 'Подготовка брифа',
  project_spec_ready: 'Спецификация проекта готова',
  prepare_design_artifacts: 'Подготовка описания дизайна',
  design_artifacts_ready: 'Описание дизайна и токены готовы',
  prepare_reference_image: 'Подготовка визуального референса',
  reference_ready: 'Визуальный референс готов',
  pipeline_failed: 'Ошибка пайплайна',
}

const STEP_PROGRESS: Record<string, number> = {
  queued: 8,
  prepare_brief: 28,
  project_spec_ready: 42,
  prepare_design_artifacts: 58,
  design_artifacts_ready: 74,
  prepare_reference_image: 88,
  reference_ready: 100,
  pipeline_failed: 100,
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

type RunDetailsTab = 'overview' | 'reference' | 'spec' | 'design' | 'logs'

const TABS: Array<{ id: RunDetailsTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'reference', label: 'Референс' },
  { id: 'spec', label: 'Спецификация' },
  { id: 'design', label: 'Дизайн' },
  { id: 'logs', label: 'Логи' },
]

function formatRunTitle(slug: string) {
  return slug.replace(/^run-(\d+)$/, 'Запуск $1')
}

function getRunTitle(run: { slug: string; displayName: string | null }) {
  return run.displayName || formatRunTitle(run.slug)
}

function formatStep(step: string | null) {
  return step ? STEP_LABELS[step] || step : 'Ожидаем статус пайплайна'
}

function getProgress(step: string | null, status: string) {
  if (status === 'completed') return 100
  if (status === 'failed') return 100
  return step ? STEP_PROGRESS[step] || 12 : 12
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

function renderDesignTokens(content: string) {
  try {
    const tokens = JSON.parse(content) as Record<string, Record<string, string | number>>

    return (
      <dl className={styles.spec}>
        {Object.entries(tokens).flatMap(([groupName, group]) =>
          Object.entries(group).map(([key, value]) => (
            <div key={`${groupName}-${key}`}>
              <dt>
                {groupName} · {key}
              </dt>
              <dd>{String(value)}</dd>
            </div>
          )),
        )}
      </dl>
    )
  } catch {
    return <pre>{content}</pre>
  }
}

function SkeletonBlock({ lines = 4 }: { lines?: number }) {
  return (
    <div className={styles.skeletonBlock} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

export default function RunDetailsPage() {
  const [activeTab, setActiveTab] = useState<RunDetailsTab>('overview')
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const navigate = useNavigate()
  const { runId = '' } = useParams()
  const runQuery = useRunQuery(runId)
  const updateRunMutation = useUpdateRunMutation()
  const deleteRunMutation = useDeleteRunMutation()
  const run = runQuery.data
  const projectSpecArtifact = run?.artifacts.find(artifact => artifact.type === 'project_spec')
  const referenceArtifact = run?.artifacts.find(artifact => artifact.type === 'reference_image')
  const designDescriptionArtifact = run?.artifacts.find(artifact => artifact.type === 'design_description')
  const designTokensArtifact = run?.artifacts.find(artifact => artifact.type === 'design_tokens')
  const projectSpecQuery = useArtifactContentQuery(run?.id ?? '', projectSpecArtifact?.id)
  const designDescriptionQuery = useArtifactContentQuery(run?.id ?? '', designDescriptionArtifact?.id)
  const designTokensQuery = useArtifactContentQuery(run?.id ?? '', designTokensArtifact?.id)
  const progress = getProgress(run?.currentStep ?? null, run?.status ?? 'queued')

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

  const handleStartRename = () => {
    setDraftName(run.displayName || formatRunTitle(run.slug))
    setIsRenaming(true)
  }

  const handleSaveRename = () => {
    updateRunMutation.mutate(
      {
        runId: run.id,
        displayName: draftName.trim() || null,
      },
      {
        onSuccess: () => {
          setIsRenaming(false)
          toast.success('Название запуска обновлено')
        },
        onError: () => toast.error('Не удалось переименовать запуск'),
      },
    )
  }

  const handleDeleteRun = () => {
    if (!window.confirm(`Удалить «${getRunTitle(run)}»? Папка запуска в generated тоже будет удалена.`)) {
      return
    }

    deleteRunMutation.mutate(run.id, {
      onSuccess: () => navigate('/'),
      onError: () => toast.error('Не удалось удалить запуск'),
    })
  }

  return (
    <section className={styles.page}>
      <Link to="/">Назад к запускам</Link>
      <div className={styles.header}>
        <div>
          {isRenaming ? (
            <div className={styles.renameForm}>
              <input
                value={draftName}
                maxLength={80}
                autoFocus
                onChange={event => setDraftName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSaveRename()
                  if (event.key === 'Escape') setIsRenaming(false)
                }}
              />
              <button type="button" disabled={updateRunMutation.isPending} onClick={handleSaveRename}>
                Сохранить
              </button>
              <button type="button" onClick={() => setIsRenaming(false)}>
                Отмена
              </button>
            </div>
          ) : (
            <h1>{getRunTitle(run)}</h1>
          )}
          <p>{formatStep(run.currentStep)}</p>
        </div>
        <div className={styles.headerActions}>
          <RunStatusBadge status={run.status} />
          <button type="button" onClick={handleStartRename}>
            Переименовать
          </button>
          <button type="button" className={styles.dangerButton} disabled={deleteRunMutation.isPending} onClick={handleDeleteRun}>
            Удалить
          </button>
        </div>
      </div>

      <div className={styles.progressPanel}>
        <div>
          <strong>{formatStep(run.currentStep)}</strong>
          <span>{progress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Разделы запуска">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.activeTab : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div key={activeTab} className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            <div className={styles.panel}>
              <h2>Бриф</h2>
              <pre>{run.brief}</pre>
            </div>

            <div className={styles.panel}>
              <h2>Артефакты</h2>
              {run.artifacts.length === 0 && <SkeletonBlock lines={3} />}
              <ul className={styles.list}>
                {run.artifacts.map(artifact => (
                  <li key={artifact.id}>
                    <strong>{formatArtifactType(artifact)}</strong>
                    <span>{artifact.path}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'reference' && (
          <div className={styles.previewPanel}>
            <h2>Визуальный референс</h2>
            {!referenceArtifact && <SkeletonBlock lines={6} />}
            {referenceArtifact && (
              <img
                src={runsApi.getArtifactFileUrl(run.id, referenceArtifact.id)}
                alt="Визуальный референс первого экрана"
              />
            )}
          </div>
        )}

        {activeTab === 'spec' && (
          <div className={styles.panel}>
            <h2>Спецификация проекта</h2>
            {!projectSpecArtifact && <SkeletonBlock lines={8} />}
            {projectSpecQuery.isLoading && <p>Загружаем спецификацию проекта...</p>}
            {projectSpecQuery.isError && <p>Не удалось загрузить спецификацию проекта.</p>}
            {projectSpecQuery.data && renderProjectSpec(projectSpecQuery.data.content)}
          </div>
        )}

        {activeTab === 'design' && (
          <div className={styles.overviewGrid}>
            <div className={styles.panel}>
              <h2>Описание дизайна</h2>
              {!designDescriptionArtifact && <SkeletonBlock lines={9} />}
              {designDescriptionQuery.isLoading && <p>Загружаем описание дизайна...</p>}
              {designDescriptionQuery.isError && <p>Не удалось загрузить описание дизайна.</p>}
              {designDescriptionQuery.data && <pre>{designDescriptionQuery.data.content}</pre>}
            </div>

            <div className={styles.panel}>
              <h2>Дизайн-токены</h2>
              {!designTokensArtifact && <SkeletonBlock lines={9} />}
              {designTokensQuery.isLoading && <p>Загружаем дизайн-токены...</p>}
              {designTokensQuery.isError && <p>Не удалось загрузить дизайн-токены.</p>}
              {designTokensQuery.data && renderDesignTokens(designTokensQuery.data.content)}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className={styles.panel}>
            <h2>Логи</h2>
            {run.logs.length === 0 && <SkeletonBlock lines={5} />}
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
        )}
      </div>
    </section>
  )
}
