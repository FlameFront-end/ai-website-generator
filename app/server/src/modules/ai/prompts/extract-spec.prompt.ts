import type { ChatMessage } from '../providers/ai-provider.interface';

const SYSTEM = `Ты — продуктовый аналитик. Из брифа клиента извлеки структурированную спецификацию проекта.

Верни ТОЛЬКО валидный JSON (без markdown-обёрток) со следующей структурой:
{
  "siteType": "лендинг" | "сайт" | "промо-страница",
  "sectionType": "hero-блок" | "features" | "pricing" | "about",
  "style": ["описание стиля 1", "описание стиля 2"],
  "audience": "описание целевой аудитории",
  "requiredElements": ["заголовок", "описание", "основная кнопка", ...],
  "copy": {
    "headline": "заголовок сайта",
    "description": "подзаголовок / описание",
    "primaryButton": "текст основной кнопки",
    "secondaryButton": "текст второй кнопки"
  },
  "visualPreferences": ["предпочтение 1", "предпочтение 2"]
}

Правила:
- Если бриф не содержит явных значений, придумай подходящие по контексту.
- style и visualPreferences — массивы коротких описаний (2-5 элементов).
- requiredElements всегда должен содержать минимум: заголовок, описание, основная кнопка.
- copy.headline — ёмкий, продающий заголовок.
- copy.description — 1-2 предложения.`;

export function buildExtractSpecMessages(brief: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Бриф:\n\n${brief}` },
  ];
}
