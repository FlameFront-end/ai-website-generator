import type { RunDetailsTab } from "./types";

export const STEP_LABELS: Record<string, string> = {
  queued: "В очереди",
  prepare_brief: "Подготовка брифа",
  project_spec_ready: "Спецификация проекта готова",
  prepare_design_artifacts: "Подготовка описания дизайна",
  design_artifacts_ready: "Описание дизайна и токены готовы",
  prepare_reference_image: "Подготовка визуального референса",
  reference_ready: "Визуальный референс готов",
  prepare_frontend_project: "Генерация клиентского проекта",
  generate_code: "Генерация кода",
  code: "Код",
  build_project: "Сборка проекта",
  build: "Сборка проекта",
  built: "Сборка завершена",
  build_success: "Сборка успешна",
  take_screenshots: "Создание скриншотов",
  screenshots_ready: "Скриншоты готовы",
  visual_qa: "Визуальный анализ",
  completed: "Завершено",
  frontend_project_ready: "Клиентский проект готов",
  pipeline_failed: "Ошибка пайплайна",
  build_failed: "Ошибка сборки",
  screenshots_failed: "Ошибка создания скриншотов",
  visual_qa_failed: "Ошибка визуального анализа",
  awaiting_spec_approval: "Ожидание подтверждения спецификации",
  awaiting_design_approval: "Ожидание подтверждения дизайна",
  awaiting_reference_approval: "Ожидание подтверждения референса",
  awaiting_code_approval: "Ожидание подтверждения кода",
  awaiting_final_approval: "Ожидание финального подтверждения",
  spec: "Спецификация",
  design: "Дизайн",
  reference: "Референс",
  final: "Финальная проверка",
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
  awaiting_spec_approval: 25,
  awaiting_design_approval: 45,
  awaiting_reference_approval: 65,
  awaiting_code_approval: 75,
  awaiting_final_approval: 98,
};

export const ARTIFACT_LABELS: Record<string, string> = {
  project_spec: "Спецификация проекта",
  reference_image: "Визуальный референс",
  design_description: "Описание дизайна",
  design_tokens: "Дизайн-токены",
  frontend_project: "Клиентский проект",
  desktop_screenshot: "Скриншот desktop",
  mobile_screenshot: "Скриншот mobile",
  visual_report: "Отчет визуальной проверки",
  diff_image: "Изображение отличий",
  build_error: "Ошибка сборки",
  build_log: "Логи сборки",
  reference_validation: "Проверка референса",
};

export const TABS: Array<{ id: RunDetailsTab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "spec", label: "Спецификация" },
  { id: "design", label: "Дизайн" },
  { id: "reference", label: "Референс" },
  { id: "code", label: "Код" },
  { id: "result", label: "Результат" },
  { id: "artifacts", label: "Артефакты" },
  { id: "logs", label: "Логи" },
];

/**
 * Ordered pipeline steps — each tab unlocks once its minimum step has been reached.
 */
const STEP_ORDER: string[] = [
  "queued",
  "prepare_brief",
  // spec tab unlocks here
  "awaiting_spec_approval",
  "prepare_design_artifacts",
  // design tab unlocks here
  "prepare_design_tokens",
  "awaiting_design_approval",
  "prepare_reference_image",
  // reference tab unlocks here
  "awaiting_reference_approval",
  "prepare_frontend_project",
  // code tab unlocks here
  "awaiting_code_approval",
  "build_project",
  "built",
  "take_screenshots",
  "screenshots_ready",
  // result tab unlocks here
  "visual_qa",
  "visual_qa_failed",
  "awaiting_final_approval",
  "completed",
  "pipeline_failed",
  "build_failed",
  "screenshots_failed",
];

/** Minimum step index at which each tab becomes available */
const TAB_MIN_STEP: Record<RunDetailsTab, number> = {
  overview: 0,
  spec: STEP_ORDER.indexOf("awaiting_spec_approval"),
  design: STEP_ORDER.indexOf("awaiting_design_approval"),
  reference: STEP_ORDER.indexOf("awaiting_reference_approval"),
  code: STEP_ORDER.indexOf("awaiting_code_approval"),
  result: STEP_ORDER.indexOf("screenshots_ready"),
  artifacts: 0,
  logs: 0,
};

function getStepIndex(step: string): number {
  const idx = STEP_ORDER.indexOf(step);
  return idx === -1 ? 0 : idx;
}

export function isTabAvailable(
  tabId: RunDetailsTab,
  _status: string,
  currentStep?: string,
): boolean {
  const alwaysAvailable: RunDetailsTab[] = ["overview", "artifacts", "logs"];

  if (alwaysAvailable.includes(tabId)) {
    return true;
  }

  const step = currentStep ?? _status;
  const currentIndex = getStepIndex(step);
  const requiredIndex = TAB_MIN_STEP[tabId];

  return currentIndex >= requiredIndex;
}

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
];

export const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/html",
  "text/css",
  "text/typescript",
  "text/javascript",
  "application/json",
];
