import type { ChatMessage } from '../providers/ai-provider.interface';
import type { ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — UI-дизайнер. На основе спецификации проекта сгенерируй дизайн-токены.

Верни ТОЛЬКО валидный JSON (без markdown-обёрток) со следующей структурой:
{
  "colors": {
    "background": "#hex или rgb()",
    "textPrimary": "#hex",
    "textSecondary": "#hex",
    "accent": "#hex",
    "surface": "rgba() или #hex",
    "border": "rgba() или #hex"
  },
  "layout": {
    "containerWidth": "1200px",
    "sectionPaddingY": "96px",
    "sectionPaddingX": "32px",
    "columns": 1 или 2
  },
  "typography": {
    "headlineSize": "64px",
    "headlineWeight": 700,
    "bodySize": "18px",
    "lineHeight": "1.08"
  },
  "components": {
    "buttonRadius": "999px" или "12px",
    "cardRadius": "24px",
    "cardShadow": "CSS box-shadow значение"
  }
}

Правила:
- Цвета должны гармонировать между собой и соответствовать стилю проекта.
- Если стиль «тёмный» / «dark» — background должен быть тёмным, textPrimary светлым.
- Если стиль «светлый» / «light» — наоборот.
- accent — яркий, контрастный цвет для кнопок и акцентов.
- surface — полупрозрачный или чуть отличающийся от background для карточек.`;

export function buildDesignTokensMessages(spec: ProjectSpec): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Спецификация проекта:\n\n${JSON.stringify(spec, null, 2)}`,
    },
  ];
}
