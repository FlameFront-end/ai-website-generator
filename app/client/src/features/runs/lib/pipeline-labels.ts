import type { PipelineStep, RunStatus } from "@/api/services/runs";

export const STATUS_LABELS: Record<RunStatus, string> = {
  queued: "В очереди",
  running: "В работе",
  reference_failed: "Ошибка",
  build_failed: "Ошибка сборки",
  visual_failed: "Ошибка",
  needs_manual_review: "Проверка",
  completed: "Готово",
  failed: "Ошибка",
  awaiting_style_selection: "Выбор визуального стиля",
  awaiting_reference_approval: "Ожидание подтверждения",
  awaiting_code_approval: "Ожидание подтверждения",
  awaiting_final_approval: "Ожидание подтверждения",
};

export const STEP_LABELS: Record<PipelineStep, string> = {
  queued: "В очереди",
  prepare_brief: "Подготовка брифа",
  generate_style_variants: "Подбираем визуальные направления",
  awaiting_style_selection: "Выберите визуальный стиль",
  prepare_reference_image: "Подготовка визуального референса",
  reference_ready: "Визуальный референс готов",
  awaiting_reference_approval: "Ожидание подтверждения референса",
  prepare_frontend_project: "Генерация клиентского проекта",
  generate_code: "Генерация кода",
  build_project: "Сборка проекта",
  build: "Сборка проекта",
  built: "Сборка завершена",
  build_success: "Сборка успешна",
  build_failed: "Ошибка сборки",
  take_screenshots: "Создание скриншотов",
  screenshots_ready: "Скриншоты готовы",
  screenshots_failed: "Ошибка создания скриншотов",
  visual_qa: "Визуальный анализ",
  visual_qa_failed: "Ошибка визуального анализа",
  awaiting_code_approval: "Ожидание подтверждения кода",
  awaiting_final_approval: "Ожидание финального подтверждения",
  frontend_project_ready: "Клиентский проект готов",
  completed: "Завершено",
  pipeline_failed: "Ошибка пайплайна",
};

export function getStepLabel(step: string): string {
  const label = STEP_LABELS[step as PipelineStep];
  if (label) return label;

  const normalized = step.replace(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function isKnownStep(step: string): step is PipelineStep {
  return step in STEP_LABELS;
}
