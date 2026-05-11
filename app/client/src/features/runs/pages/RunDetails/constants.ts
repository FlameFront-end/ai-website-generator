import type { RunDetailsTab } from './types';

export const STEP_LABELS: Record<string, string> = {
  queued: 'В очереди',
  prepare_brief: 'Подготовка брифа',
  project_spec_ready: 'Спецификация проекта готова',
  prepare_design_artifacts: 'Подготовка описания дизайна',
  design_artifacts_ready: 'Описание дизайна и токены готовы',
  prepare_reference_image: 'Подготовка визуального референса',
  reference_ready: 'Визуальный референс готов',
  prepare_frontend_project: 'Генерация клиентского проекта',
  build_project: 'Сборка проекта',
  build_success: 'Сборка успешна',
  take_screenshots: 'Создание скриншотов',
  screenshots_ready: 'Скриншоты готовы',
  visual_qa: 'Визуальный анализ',
  completed: 'Завершено',
  frontend_project_ready: 'Клиентский проект готов',
  pipeline_failed: 'Ошибка пайплайна',
  build_failed: 'Ошибка сборки',
  screenshots_failed: 'Ошибка создания скриншотов',
  visual_qa_failed: 'Ошибка визуального анализа',
};

export const STEP_PROGRESS: Record<string, number> = {
  queued: 5,
  prepare_brief: 15,
  project_spec_ready: 25,
  prepare_design_artifacts: 35,
  design_artifacts_ready: 45,
  prepare_reference_image: 55,
  reference_ready: 65,
  prepare_frontend_project: 75,
  build_project: 80,
  build_success: 85,
  take_screenshots: 90,
  screenshots_ready: 95,
  visual_qa: 98,
  completed: 100,
  frontend_project_ready: 100,
  pipeline_failed: 100,
  build_failed: 100,
  screenshots_failed: 100,
  visual_qa_failed: 100,
};

export const ARTIFACT_LABELS: Record<string, string> = {
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
  build_log: 'Логи сборки',
  reference_validation: 'Проверка референса',
};

export const TABS: Array<{ id: RunDetailsTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'spec', label: 'Спецификация' },
  { id: 'reference', label: 'Референс' },
  { id: 'design', label: 'Дизайн' },
  { id: 'code', label: 'Код' },
  { id: 'result', label: 'Результат' },
  { id: 'artifacts', label: 'Артефакты' },
  { id: 'logs', label: 'Логи' },
];

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'image/gif',
];

export const TEXT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/typescript',
  'text/javascript',
  'application/json',
];
