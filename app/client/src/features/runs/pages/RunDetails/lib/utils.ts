import type { RunArtifact } from "@/api/services/runs";

import {
  ARTIFACT_LABELS,
  getStepLabel,
  isKnownStep,
  STEP_PROGRESS,
} from "./constants";

export function formatStep(step: string | null): string {
  return step ? getStepLabel(step) : "Ожидаем статус пайплайна";
}

export function getProgress(step: string | null, status: string): number {
  if (status === "completed") return 100;
  if (status === "failed") return 100;
  return step ? STEP_PROGRESS[step] || 12 : 12;
}

export function formatArtifactType(artifact: RunArtifact): string {
  if (artifact.type === "style_variant_image") {
    return `Превью стиля: ${humanizeTechnicalKey(getArtifactFileStem(artifact.path))}`;
  }

  return ARTIFACT_LABELS[artifact.type] || humanizeTechnicalKey(artifact.type);
}

export function humanizeTechnicalKey(value: string): string {
  const normalized = value.replace(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getArtifactFileStem(path: string): string {
  const fileName = path.split("/").pop() ?? path;
  return fileName.replace(/\.[^.]+$/, "");
}

const LOG_MESSAGE_LABELS: Record<string, string> = {
  "Запуск поставлен в очередь": "Проект добавлен в очередь",
  "Начата обработка брифа": "Анализируем бриф",
  "Спецификация проекта сохранена": "Спецификация готова",
  "Ожидание подтверждения спецификации":
    "Проверьте спецификацию и подтвердите шаг",
  "Начато описание дизайна": "Формируем описание дизайна",
  "Описание дизайна сохранено": "Описание дизайна готово",
  "Начата генерация дизайн-токенов": "Подбираем дизайн-токены",
  "Дизайн-токены сохранены": "Дизайн-токены готовы",
  "Ожидание подтверждения дизайна": "Проверьте дизайн и подтвердите шаг",
  "Начата подготовка визуального референса": "Готовим визуальный референс",
  "Визуальный референс сохранен": "Визуальный референс готов",
  "Ожидание подтверждения визуального референса":
    "Проверьте референс и подтвердите шаг",
  "Начата генерация клиентского проекта": "Генерируем код сайта",
  "Клиентский проект сгенерирован": "Код сайта готов",
  "Ожидание подтверждения кода": "Проверьте код и подтвердите шаг",
  'Шаг "Код" подтверждён': "Код подтверждён",
  "Установка зависимостей...": "Устанавливаем зависимости",
  "Сборка проекта...": "Проверяем production-сборку",
  "Сборка завершена успешно": "Сборка прошла успешно",
  "Ошибка сборки": "Сборка завершилась ошибкой",
  "Начато создание скриншотов": "Готовим скриншоты результата",
  "Запуск production сервера...": "Запускаем предпросмотр сайта",
  "Создание скриншотов через Playwright...": "Создаём скриншоты страницы",
  "Desktop скриншот сохранен": "Desktop-скриншот готов",
  "Mobile скриншот сохранен": "Mobile-скриншот готов",
  "Ошибка создания скриншотов": "Не удалось создать скриншоты",
  "Начат визуальный анализ": "Сравниваем результат с референсом",
  "Визуальный анализ завершен": "Визуальная проверка завершена",
  "Ошибка визуального анализа": "Визуальная проверка завершилась ошибкой",
  "Ожидание финального подтверждения": "Проверьте результат и завершите проект",
  "Проект завершён": "Проект завершён",
  "Пайплайн завершился ошибкой": "Процесс остановлен из-за ошибки",
  "Запрошен перезапуск генерации кода": "Запрос на перегенерацию кода принят",
  "Запущен перезапуск шага кода проекта": "Перегенерируем код сайта",
  "Код перегенерирован": "Код сайта перегенерирован",
  "Запущена ручная пересборка": "Запущена повторная сборка",
};

export function translateLogMessage(message: string): string {
  const translated = LOG_MESSAGE_LABELS[message] ?? message;

  const withStepLabels = translated.replace(
    /"([^"]+)"/g,
    (match, key: string) => {
      if (!isKnownStep(key)) return match;
      return `"${getStepLabel(key)}"`;
    },
  );

  return withStepLabels
    .replace(/^Попытка сборки (\d+)$/, "Проверка сборки: попытка $1")
    .replace(
      /^Запрошен перезапуск текущего шага "([^"]+)"$/,
      'Запрос на перезапуск шага "$1" принят',
    )
    .replace(
      /^Запущен перезапуск шага (.+)$/,
      (_match, step: string) => `Перезапускаем шаг: ${step}`,
    )
    .replace(
      /^Шаг "([^"]+)" подтверждён$/,
      (_match, step: string) => `Шаг подтверждён: ${step}`,
    );
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

export function shortenArtifactPath(fullPath: string): string {
  const runsIndex = fullPath.indexOf("/runs/");
  if (runsIndex === -1) return fullPath;
  return fullPath.slice(runsIndex + 6);
}
